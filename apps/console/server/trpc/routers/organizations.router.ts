import { z } from 'zod'
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
        siteUrl,
        private: { polarAccessToken, polarServer, polarCheckoutSuccessUrl },
      } = useRuntimeConfig()

      // 1. Find the selected plan from app.config
      const plans = useAppConfig().plans
      const selectedPlan = plans.find((p: any) => p.id === planId)
      if (!selectedPlan) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid plan selected.',
        })
      }

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
        organizationId: newOrg.id,
        userId: user.id,
        access: 'ADMIN',
      })

      // 4. Handle payment flow for paid plans
      let checkoutUrl: string | null = null
      if (selectedPlan.productId) {
        const polar = new Polar({
          accessToken: polarAccessToken,
          server: polarServer as 'sandbox' | 'production',
        })

        try {
          const checkout = await polar.checkouts.create({
            products: [selectedPlan.productId],
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
        siteUrl,
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
      const { siteUrl, private: { polarAccessToken, polarServer } } = useRuntimeConfig()

      const customer = await db.query.customers.findFirst({
        where: eq(customers.organizationId, organizationId),
      })

      if (!customer || !customer.polarCustomerId) {
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
          customerId: customer.polarCustomerId
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
          eq(memberships.organizationId, orgId),
          eq(memberships.userId, user.id),
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
          eq(applications.organizationId, orgId),
          eq(applications.deletedAt, null),
        ),
      })

      if (existingApplications.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Organization cannot be deleted as it still has active applications.',
        })
      }

      // 3. Soft delete the organization
      const now = new Date()
      await db.update(organizations).set({ deletedAt: now }).where(eq(organizations.id, orgId))

      return { success: true }
    }),
})
