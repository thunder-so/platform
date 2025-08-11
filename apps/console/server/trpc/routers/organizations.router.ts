import { nullable, z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc/init'
import { db } from '~/server/db/db'
import { organizations, memberships, subscriptions, customers, applications } from '~/server/db/schema'
import { Polar } from '@polar-sh/sdk'
import { TRPCError } from '@trpc/server'
import { eq, and, inArray } from 'drizzle-orm'

export const organizationsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        planId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { name, planId } = input
      const {
        public: { siteUrl },
        private: { polarAccessToken, polarServer, polarCheckoutSuccessUrl },
      } = useRuntimeConfig()

      // 1. Find the selected plan from app.config
      // const plans = useAppConfig().plans
      // const selectedPlan = plans.find((p: any) => p.id === planId)
      // if (!selectedPlan) {
      //   throw new TRPCError({
      //     code: 'BAD_REQUEST',
      //     message: 'Invalid plan selected.',
      //   })
      // }

      // 2. Create the organization in the database
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name
        })
        .returning()

      if (!newOrg) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create organization.',
        })
      }

      // 3. Create the membership for the user
      await db.insert(memberships).values({
        organization_id: newOrg.id,
        user_id: user.id,
        access: 'ADMIN',
      })

      // 4. Handle payment flow for paid plans
      let checkoutUrl: string | null = null
      if (planId !== 'free') {
        const polar = new Polar({
          accessToken: polarAccessToken,
          server: polarServer as 'sandbox' | 'production',
        })

        try {
          const checkout = await polar.checkouts.create({
            products: [planId],
            successUrl: `${siteUrl}${polarCheckoutSuccessUrl}`,
            customerEmail: user.email,
            metadata: {
              organization_id: newOrg.id,
              user_id: user.id,
            },
          })

          checkoutUrl = checkout.url
        } catch (polarError) {
          console.error('Polar checkout creation failed:', polarError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Could not create a payment checkout session.',
          })
        }
      }

      // 5. Return the new organization and checkout URL
      return {
        ...newOrg,
        checkoutUrl,
      }
    }),

  verifyCheckout: protectedProcedure
    .input(
      z.object({
        checkoutId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { checkoutId } = input
      const {
        private: { polarAccessToken, polarServer },
      } = useRuntimeConfig()

      const polar = new Polar({
        accessToken: polarAccessToken,
        server: polarServer as 'sandbox' | 'production',
      })

      try {
        const checkout = await polar.checkouts.get({ id: checkoutId })
        const organizationId = checkout.metadata?.organization_id as
          | string
          | undefined

        if (!organizationId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organization ID not found in checkout metadata.',
          })
        }

        return {
          organizationId,
        }
      } catch (error) {
        console.error('Failed to retrieve checkout session:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve checkout session.',
        })
      }
    }),

  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        productId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, productId } = input;
      const { user } = ctx;
      const {
        public: { siteUrl },
        private: { polarAccessToken, polarServer, polarCheckoutSuccessUrl },
      } = useRuntimeConfig();

      const polar = new Polar({
        accessToken: polarAccessToken,
        server: polarServer as 'sandbox' | 'production',
      });

      try {
        const checkout = await polar.checkouts.create({
          products: [productId],
          successUrl: `${siteUrl}${polarCheckoutSuccessUrl}`,
          customerEmail: user.email,
          metadata: {
            organization_id: organizationId,
            user_id: user.id,
          },
        });
        return { checkoutUrl: checkout.url };
      } catch (polarError) {
        console.error('Polar checkout creation failed:', polarError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create a payment checkout session.',
        });
      }
    }),

  createPortalSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = input
      const { 
        public: { siteUrl }, 
        private: { polarAccessToken, polarServer } 
      } = useRuntimeConfig()

      const customer = await db.query.customers.findFirst({
        where: eq(customers.organization_id, organizationId),
      })

      if (!customer || !customer.polar_customer_id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found.',
        })
      }

      const polar = new Polar({
        accessToken: polarAccessToken,
        server: polarServer as 'sandbox' | 'production',
      })

      try {
        const portal = await polar.customerSessions.create({
          customerId: customer.polar_customer_id
        })
        return { url: portal.customerPortalUrl }
      } catch (error) {
        console.error('Failed to create portal session:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create portal session.',
        })
      }
    }),

  delete: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = input
      const { user } = ctx

      // 1. Verify user is an ADMIN of the organization
      const membership = await db.query.memberships.findFirst({
        where: and(
          eq(memberships.organization_id, orgId),
          eq(memberships.user_id, user.id),
          eq(memberships.access, 'ADMIN')
        ),
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this organization.',
        })
      }

      // 2. Check for existing non-deleted applications
      const existingApplications = await db.query.applications.findMany({
        where: and(
          eq(applications.organization_id, orgId),
          eq(applications.deleted_at, null),
        ),
      })

      if (existingApplications.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Organization cannot be deleted as it still has active applications.',
        })
      }

      // 3. Soft delete the organization and its memberships in a transaction
      const now = new Date()
      await db.transaction(async (tx) => {
        await tx.update(organizations).set({ deleted_at: now }).where(eq(organizations.id, orgId));
        await tx.update(memberships).set({ deleted_at: now }).where(eq(memberships.organization_id, orgId));
      });

      return { success: true }
    }),

  getUserMemberships: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx;
      const userMemberships = await db.query.memberships.findMany({
        where: eq(memberships.user_id, user.id),
        with: {
          organization: {
            with: {
              subscriptions: {
                where: and(
                  eq(subscriptions.status, 'active'),
                ),
              },
            },
          },
        },
      });

      return userMemberships.map((m) => ({
        ...m.organization,
        subscription: m.organization.subscriptions.length > 0 ? 'Pro' : 'Free',
      }));
    }),
})
