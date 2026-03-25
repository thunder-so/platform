import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { db } from '../../db/db'
import { memberships, users, organizations, subscriptions, orders } from '../../db/schema'
import { eq, and, isNull, sql, or } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { Polar } from '@polar-sh/sdk'
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

      // Check plan limits - get the latest subscription
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organization_id, input.organizationId),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        ),
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.created)]
      });

      // Check for free plan limits
      if (subscription && (subscription.metadata as any)?.prices?.[0]?.amount_type === 'free') {
        const memberCount = await db.select({ count: sql`count(*)` })
          .from(memberships)
          .where(and(
            eq(memberships.organization_id, input.organizationId),
            eq(memberships.pending, false),
            isNull(memberships.deleted_at)
          ));
        
        trackServerEvent('plan_limit_enforced', {
          org_id: input.organizationId,
          plan_type: 'free',
          current_members: Number(memberCount[0]?.count || 0),
          limit: 1
        });
        
        if (Number(memberCount[0]?.count || 0) >= 1) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Free plan is limited to 1 team member. Upgrade to add more members.',
          });
        }
      }

      // Check seat availability for seat-based plans
      if (subscription && (subscription.metadata as any)?.prices?.[0]?.amount_type === 'seat_based') {
        const { private: { polarAccessToken, polarServer } } = useRuntimeConfig();
        const polar = new Polar({
          accessToken: polarAccessToken,
          server: polarServer as 'sandbox' | 'production',
        });

        try {
          const seatsList = await polar.customerSeats.listSeats({
            subscriptionId: subscription.id
          });
          
          trackServerEvent('seat_availability_validated', {
            org_id: input.organizationId,
            subscription_id: subscription.id,
            available_seats: seatsList.availableSeats,
            total_seats: seatsList.totalSeats
          });
          
          if (seatsList.availableSeats <= 0) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'No available seats. Purchase more seats to invite members.',
            });
          }
        } catch (polarError) {
          trackServerEvent('polar_api_failure', {
            operation: 'seat_availability_check',
            subscription_id: subscription.id,
            error: polarError instanceof Error ? polarError.message : 'Unknown error'
          });
          console.error('Failed to check seat availability:', polarError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Could not verify seat availability.',
          });
        }

        // Assign seat via Polar
        try {
          await polar.customerSeats.assignSeat({
            subscriptionId: subscription.id,
            email: input.email,
          });
          
          trackServerEvent('polar_seat_auto_assigned', {
            org_id: input.organizationId,
            subscription_id: subscription.id,
            email: input.email
          });
        } catch (polarError) {
          trackServerEvent('polar_api_failure', {
            operation: 'seat_assignment',
            subscription_id: subscription.id,
            error: polarError instanceof Error ? polarError.message : 'Unknown error'
          });
          console.error('Polar seat assignment failed:', polarError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Could not assign seat.',
          });
        }
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

      // Claim seat for seat-based plans
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organization_id, input.organizationId),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        )
      });

      if (subscription && (subscription.metadata as any)?.prices?.[0]?.amount_type === 'seat_based') {
        const { private: { polarAccessToken, polarServer } } = useRuntimeConfig();
        const polar = new Polar({
          accessToken: polarAccessToken,
          server: polarServer as 'sandbox' | 'production',
        });

        try {
          await polar.customerSeats.assignSeat({
            subscriptionId: subscription.id,
            email: user.email,
          });
          
          trackServerEvent('polar_seat_claimed', {
            org_id: input.organizationId,
            subscription_id: subscription.id,
            user_id: user.sub
          });
        } catch (polarError) {
          trackServerEvent('polar_api_failure', {
            operation: 'seat_claim',
            subscription_id: subscription.id,
            error: polarError instanceof Error ? polarError.message : 'Unknown error'
          });
          console.error('Polar seat claim failed:', polarError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Could not claim seat for this invitation.',
          });
        }
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
      // Check for active subscription first - get the most recent one
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organization_id, input.organizationId),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        ),
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.created)]
      });

      if (subscription) {
        const isSeatBased = (subscription.metadata as any)?.prices?.[0]?.amount_type === 'seat_based';
        
        if (isSeatBased) {
          // For seat-based plans, get seat info from Polar API
          try {
            const { private: { polarAccessToken, polarServer } } = useRuntimeConfig();
            const polar = new Polar({
              accessToken: polarAccessToken,
              server: polarServer as 'sandbox' | 'production',
            });
            
            const seatsList = await polar.customerSeats.listSeats({
              subscriptionId: subscription.id
            });
            
            return {
              used: seatsList.totalSeats - seatsList.availableSeats,
              total: seatsList.totalSeats,
              isSeatBased: true
            };
          } catch (polarError) {
            console.error('Failed to fetch seat info from Polar:', polarError);
            // Fallback: count from database
            const memberCount = await db.select({ count: sql`count(*)` })
              .from(memberships)
              .where(and(
                eq(memberships.organization_id, input.organizationId),
                isNull(memberships.deleted_at)
              ));
            
            const totalSeats = (subscription.metadata as any)?.seats || 
                              ((subscription.metadata as any)?.price?.seat_tiers?.tiers?.[0]?.min_seats) || 1;
            
            return {
              used: Number(memberCount[0]?.count || 0),
              total: totalSeats,
              isSeatBased: true
            };
          }
        } else {
          // For non-seat-based subscriptions (Pro Monthly/Annual)
          const memberCount = await db.select({ count: sql`count(*)` })
            .from(memberships)
            .where(and(
              eq(memberships.organization_id, input.organizationId),
              isNull(memberships.deleted_at)
            ));
          
          const maxMembers = parseInt((subscription.metadata as any)?.metadata?.max_members || '1');
          const used = Number(memberCount[0]?.count || 0);

          return {
            used,
            total: maxMembers,
            isSeatBased: false
          };
        }
      }

      // Check for lifetime order
      const order = await db.query.orders.findFirst({
        where: eq(orders.organization_id, input.organizationId)
      });

      if (order) {
        // Lifetime plan - unlimited members (99)
        const memberCount = await db.select({ count: sql`count(*)` })
          .from(memberships)
          .where(and(
            eq(memberships.organization_id, input.organizationId),
            isNull(memberships.deleted_at)
          ));
        
        return {
          used: Number(memberCount[0]?.count || 0),
          total: 99,
          isSeatBased: false
        };
      }

      // Default for free plan
      return { used: 0, total: 1, isSeatBased: false };
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

  purchaseSeats: protectedProcedure
    .input(z.object({ organizationId: z.string(), additionalSeats: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { private: { polarAccessToken, polarServer } } = useRuntimeConfig();

      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organization_id, input.organizationId),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        ),
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.created)]
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active subscription found.',
        });
      }

      const polar = new Polar({
        accessToken: polarAccessToken,
        server: polarServer as 'sandbox' | 'production',
      });

      try {
        // For trial subscriptions, prevent seat updates to avoid creating new subscription
        if (subscription.status === 'trialing') {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Cannot purchase seats during trial period. Please wait until your trial converts to an active subscription.',
          });
        }
        
        // For active subscriptions, update seat count
        const seatsList = await polar.customerSeats.listSeats({
          subscriptionId: subscription.id
        });
        
        const newSeatCount = seatsList.totalSeats + input.additionalSeats;
        
        await polar.subscriptions.update({
          id: subscription.id,
          subscriptionUpdate: {
            seats: newSeatCount
          }
        });
        
        trackServerEvent('subscription_seat_updated', {
          org_id: input.organizationId,
          subscription_id: subscription.id,
          old_seat_count: seatsList.totalSeats,
          new_seat_count: newSeatCount,
          additional_seats: input.additionalSeats
        });
        
        return { success: true };
      } catch (polarError) {
        trackServerEvent('polar_api_failure', {
          operation: 'seat_update',
          subscription_id: subscription.id,
          error: polarError instanceof Error ? polarError.message : 'Unknown error'
        });
        console.error('Polar seat update failed:', polarError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not update seat count.',
        });
      }
    }),
})