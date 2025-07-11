import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { db } from '~/server/db/db'
import { memberships, users, organizations } from '~/server/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

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
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(memberships)
        .leftJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.organizationId, input.organizationId))

      return memberData
    }),

  inviteMember: protectedProcedure
    .input(z.object({ organizationId: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
        const { user } = ctx;

        // const [inviterMembership] = await db.select().from(memberships).where(and(eq(memberships.organizationId, input.organizationId), eq(memberships.userId, user.id)));

        // if (!inviterMembership || inviterMembership.access !== 'ADMIN') {
        //     throw new Error('Only admins can invite new members.');
        // }

        // Fetch organization name for the email
        const [organization] = await db.select().from(organizations).where(eq(organizations.id, input.organizationId));
        if (!organization) {
            throw new Error('Organization not found.');
        }
        const organizationName = organization.name;


        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SECRET_KEY!
        );

        // Generate magic link for the user
        const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: input.email,
            options: {
                redirectTo: `${process.env.SITE_URL}/confirm?organization_id=${input.organizationId}`,
                data: {
                    organization_id: input.organizationId
                }
            }
        });

        if (magicLinkError) {
            throw new Error(`Error generating magic link: ${magicLinkError.message}`);
        }

        const generatedLink = magicLinkData.properties.action_link;

        // Create or update the membership record
        // This handles both new users and existing users not yet in the organization
        await db.insert(memberships).values({
            organizationId: input.organizationId,
            userId: magicLinkData.user.id, // Use the user ID from generateLink
            access: 'ADMIN',
            pending: true,
            updatedAt: undefined,
            deletedAt: null,
        })
        // .onConflictDoUpdate({
        //     target: [memberships.organizationId, memberships.userId],
        //     set: { pending: memberships.pending, access: memberships.access } // Ensure it's set to pending if re-inviting
        // });

        // Construct email content for the Edge Function
        const emailSubject = `You're invited to join ${organizationName} on Thunder!`;
        const emailHtml = `
            <p>Hello,</p>
            <p>You've been invited to join <strong>${organizationName}</strong> on Thunder.</p>
            <p>Click the link below to accept the invitation:</p>
            <p><a href="${generatedLink}">Accept Invitation</a></p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
        `;

        // Call the Supabase Edge Function to send the email
        const { data: edgeFnData, error: edgeFnError } = await supabaseAdmin.functions.invoke('email-invite', {
            body: {
                to: input.email,
                subject: emailSubject,
                html: emailHtml
            }
        });

        if (edgeFnError) {
            throw new Error(`Error sending invitation email: ${edgeFnError.message}`);
        }

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

        const [removerMembership] = await db.select().from(memberships).where(and(eq(memberships.organizationId, membershipToRemove.organizationId), eq(memberships.userId, user.id)));

        if (!removerMembership || removerMembership.access !== 'ADMIN') {
            throw new Error('Only admins can remove members.');
        }

        await db.delete(memberships).where(eq(memberships.id, input.membershipId));

        return { success: true };
    }),

    getPendingInvite: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { user } = ctx
      const invites = await db
      .select({
        organization: {
          id: organizations.id,
          name: organizations.name
        },
        membership: {
          id: memberships.id,
          access: memberships.access,
        },
      })
      .from(memberships)
      .leftJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(memberships.organizationId, input.organizationId),
          eq(memberships.pending, true),
        ),
      )

      return invites.length > 0 ? invites[0] : null
    }),

    // getPendingInvites: protectedProcedure
    // .query(async ({ ctx }) => {
    //   const { user } = ctx
    //   const pendingInvites = await db
    //     .select({
    //       organization: {
    //         id: organizations.id,
    //         name: organizations.name
    //       },
    //       membership: {
    //         id: memberships.id,
    //         access: memberships.access,
    //       },
    //     })
    //     .from(memberships)
    //     .leftJoin(organizations, eq(memberships.organizationId, organizations.id))
    //     .where(and(eq(memberships.userId, user.id), eq(memberships.pending, true)))

    //   return pendingInvites
    // }),

    acceptInvite: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const [membership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, user.id),
            eq(memberships.organizationId, input.organizationId),
            eq(memberships.pending, true),
          ),
        )

      if (!membership) {
        throw new Error('Invite not found or already accepted.')
      }

      await db
        .update(memberships)
        .set({ pending: false, updatedAt: new Date() })
        .where(eq(memberships.id, membership.id))

      // const [organization] = await db
      //   .select({ name: organizations.name })
      //   .from(organizations)
      //   .where(eq(organizations.id, input.organizationId))

      return { id: input.organizationId }
    }),
})


