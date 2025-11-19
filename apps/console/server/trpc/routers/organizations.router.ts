import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { db } from '../../db/db'
import { organizations, memberships, subscriptions, customers, products, applications, type Customer, type Product, type Subscription } from '../../db/schema'
import { Polar } from '@polar-sh/sdk'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull } from 'drizzle-orm'

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

      const polar = new Polar({
        accessToken: polarAccessToken,
        server: polarServer as 'sandbox' | 'production',
      })

      let checkoutUrl: string | null = null
      let newOrg

      try {
        const result = await db.transaction(async (tx) => {
          // 1. Create organization and membership
          const [org] = await tx.insert(organizations).values({ name }).returning()
          
          if (!org) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Could not create organization.',
            })
          }

          await tx.insert(memberships).values({
            organization_id: org.id,
            user_id: user.id,
            access: 'ADMIN',
          })

          // 2. Get or create customer
          let existingCustomer = await tx.query.customers.findFirst({
            where: eq(customers.user_id, user.id)
          })

          let customer: Customer
          if (existingCustomer) {
            customer = existingCustomer
          } else {
            const newCustomer = await polar.customers.create({
              email: user.email as string,
              externalId: user.id,
            })
            
            const [newCustomerRecord] = await tx.insert(customers).values({
              user_id: user.id,
              organization_id: org.id,
              polar_customer_id: newCustomer.id,
            }).returning()
            customer = newCustomerRecord
          }

          // 3. Get product
          const product = await tx.query.products.findFirst({
            where: eq(products.id, planId)
          }) as Product

          if (!product?.metadata) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Product not found.',
            })
          }

          return { newOrg: org, customer, product }
        })

        newOrg = result.newOrg
        const { customer, product } = result

        const isFree = product.metadata.prices?.[0]?.amount_type === 'free' || false

        if (isFree) {
          // Create subscription directly for free plans
          await polar.subscriptions.create({
            customerId: customer.polar_customer_id,
            productId: planId,
            metadata: {
              user_id: user.id,
              organization_id: newOrg.id,
            },
          })
          // Set pending to false for free plans
          await db.update(organizations).set({ pending: false }).where(eq(organizations.id, newOrg.id))
        } else {
          // Create checkout for paid plans
          const isSeatBased = product.metadata.prices?.[0]?.amount_type === 'seat_based'
          const checkoutData: any = {
            products: [planId],
            successUrl: `${siteUrl}${polarCheckoutSuccessUrl}`,
            customerEmail: user.email,
            metadata: {
              user_id: user.id,
              organization_id: newOrg.id,
            },
          }
          
          // Only add seats for seat-based plans
          if (isSeatBased) {
            checkoutData.seats = 3
          }
          
          const checkout = await polar.checkouts.create(checkoutData)
          checkoutUrl = checkout.url
        }
      } catch (polarError) {
        console.error('Polar operation failed:', polarError)
        const errorMessage = polarError instanceof Error ? polarError.message : 'Unknown Polar error'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Payment system error: ${errorMessage}`,
        })
      }

      // 4. Return the new organization and checkout URL
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
      const { user } = ctx
      const {
        private: { polarAccessToken, polarServer },
      } = useRuntimeConfig()

      const polar = new Polar({
        accessToken: polarAccessToken,
        server: polarServer as 'sandbox' | 'production',
      })

      try {
        const checkout = await polar.checkouts.get({ id: checkoutId })
        const organizationId = checkout.metadata?.organization_id as string | undefined

        if (!organizationId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organization ID not found in checkout metadata.',
          })
        }

        // Assign seat only for new org creation (not plan switching)
        const isNewOrg = !checkout.metadata?.plan_change
        
        if (isNewOrg) {
          const isSeatBased = checkout.productPrice?.amountType === 'seat_based'
          
          if (isSeatBased) {
            try {
              const seat = await polar.customerSeats.assignSeat({
                checkoutId: checkoutId,
                customerId: checkout.customerId,
              })
            } catch (seatError) {
              console.error('Seat assignment failed:', seatError)
            }
          }
        }

        // Set pending to false after successful checkout
        await db.update(organizations).set({ pending: false }).where(eq(organizations.id, organizationId))
        
        return { organizationId }
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
        seats: z.number().optional(),
        plan_change: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, productId, seats, plan_change } = input;
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
        const checkoutData: any = {
          products: [productId],
          successUrl: `${siteUrl}${polarCheckoutSuccessUrl}`,
          customerEmail: user.email,
          metadata: {
            user_id: user.id,
            organization_id: organizationId,
            plan_change: plan_change ?? true,
          },
        };
        if (seats) {
          checkoutData.seats = seats;
        }
        const checkout = await polar.checkouts.create(checkoutData);
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
          isNull(applications.deleted_at),
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
        subscription: (m.organization.subscriptions as Subscription[]).length > 0 ? 'Pro' : 'Free',
      }));
    }),
})
