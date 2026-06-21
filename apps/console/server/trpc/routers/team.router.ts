import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { db } from '../../db/db'
import { memberships, users, organizations, subscriptions } from '../../db/schema'
import { eq, and, isNull, sql, or } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { trackServerEvent } from '../../utils/analytics'

export const teamRouter = router({
  getMembers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const memberData = await db
        .select({
          id: memberships.id,
          access: memberships.access,
          pending: memberships.pending,
          user: {
            id: users.id,
            email: users.email,
            fullName: users.full_name,
            avatarUrl: users.avatar_url,
          },
        })
        .from(memberships)
        .leftJoin(users, eq(memberships.user_id, users.id))
        .where(eq(memberships.organization_id, input.organizationId))

      return memberData
    }),

  inviteMember: protectedProcedure
    .input(z.object({ organizationId: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const userOpts = { distinctId: user.sub, email: user.email as string };

      // Fetch organization
      const [organization] = await db.select().from(organizations).where(eq(organizations.id, input.organizationId));
      if (!organization) {
        throw new Error('Organization not found.');
      }

      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
      );

      // Generate magic link to get user ID (don't use the link)
      const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: input.email
      });

      if (magicLinkError) {
        throw new Error(`Error generating user: ${magicLinkError.message}`);
      }

      // Check for active/trialing subscription
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organization_id, input.organizationId),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        ),
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.created)]
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'An active Pro subscription is required to invite team members.',
        });
      }

      // Create membership record
      await db.insert(memberships).values({
        organization_id: input.organizationId,
        user_id: magicLinkData.user.id,
        access: 'ADMIN',
        pending: true,
        updated_at: undefined,
        deleted_at: null,
      })

      // Send invitation via notification-webhook
      const { error: webhookError } = await supabaseAdmin.functions.invoke('notification-webhook', {
        body: {
          record: {
            type: 'TEAM_INVITE',
            metadata: {
              organization_name: organization.name,
              organization_id: input.organizationId,
              invitee_email: input.email,
              invite_url: `${process.env.SITE_URL}/org/${input.organizationId}`
            }
          }
        }
      });

      if (webhookError) {
        throw new Error(`Error sending invitation: ${webhookError.message}`);
      }

      // Sync to Resend audience
      await supabaseAdmin.functions.invoke('resend-audience-webhook', {
        body: { email: input.email }
      });

      return { success: true, message: 'Invitation sent.' };
    }),

  removeMember: protectedProcedure
    .input(z.object({ membershipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [membershipToRemove] = await db.select().from(memberships).where(eq(memberships.id, input.membershipId));

      if (!membershipToRemove) {
        throw new Error('Membership not found.');
      }

      const [removerMembership] = await db.select().from(memberships).where(and(eq(memberships.organization_id, membershipToRemove.organization_id), eq(memberships.user_id, user.sub)));

      if (!removerMembership || removerMembership.access !== 'ADMIN') {
        throw new Error('Only admins can remove members.');
      }

      // Check if this is the last active member
      const activeMembersCount = await db.select({ count: sql`count(*)` })
        .from(memberships)
        .where(and(
          eq(memberships.organization_id, membershipToRemove.organization_id),
          eq(memberships.pending, false),
          isNull(memberships.deleted_at)
        ));

      if (Number(activeMembersCount[0]?.count) <= 1) {
        throw new Error('Cannot remove the last member from the organization.');
      }

      // Check if user is billing owner (has active subscription)
      const activeSubscription = await db.select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.organization_id, membershipToRemove.organization_id),
          eq(subscriptions.user_id, membershipToRemove.user_id),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        ))
        .limit(1);

      if (activeSubscription.length > 0) {
        throw new Error('Cannot remove member who manages the organization\'s subscription.');
      }

      await db.update(memberships).set({ deleted_at: new Date() }).where(eq(memberships.id, input.membershipId));

      return { success: true };
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const userOpts = { distinctId: user.sub, email: user.email as string }
      const [membership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.user_id, user.sub),
            eq(memberships.organization_id, input.organizationId),
            eq(memberships.pending, true),
          ),
        )

      if (!membership) {
        throw new Error('Invite not found or already accepted.')
      }

      await db
        .update(memberships)
        .set({ pending: false, updated_at: new Date() })
        .where(eq(memberships.id, membership.id))

      return { id: input.organizationId }
    }),

  getSeatUsage: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const memberCount = await db.select({ count: sql`count(*)` })
        .from(memberships)
        .where(and(
          eq(memberships.organization_id, input.organizationId),
          isNull(memberships.deleted_at)
        ));

      return {
        used: Number(memberCount[0]?.count || 0),
        total: Infinity,
        isSeatBased: false
      };
    }),

  removeInvite: protectedProcedure
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [inviteToRemove] = await db.select().from(memberships).where(eq(memberships.id, input.inviteId));

      if (!inviteToRemove) {
        throw new Error('Invitation not found.');
      }

      if (!inviteToRemove.pending) {
        throw new Error('Cannot remove active member using this method.');
      }

      const [removerMembership] = await db.select().from(memberships).where(and(eq(memberships.organization_id, inviteToRemove.organization_id), eq(memberships.user_id, user.sub)));

      if (!removerMembership || removerMembership.access !== 'ADMIN') {
        throw new Error('Only admins can remove invitations.');
      }

      await db.update(memberships).set({ deleted_at: new Date() }).where(eq(memberships.id, input.inviteId));

      return { success: true };
    }),
})