import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { db } from '../../db/db'
import { organizations, memberships, subscriptions, customers, products, applications, type Customer, type Product, type Subscription } from '../../db/schema'
import { Polar } from '@polar-sh/sdk'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull } from 'drizzle-orm'
import { trackServerEvent } from '../../utils/analytics'
import { createClient } from '@supabase/supabase-js'

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

      const userOpts = { distinctId: user.sub, email: user.email as string };

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
            user_id: user.sub,
            access: 'ADMIN',
          })

          // 2. Get or create customer
          let existingCustomer = await tx.query.customers.findFirst({
            where: eq(customers.user_id, user.sub)
          })

          let customer: Customer
          if (existingCustomer) {
            customer = existingCustomer
          } else {
            const newCustomer = await polar.customers.create({
              email: user.email as string,
              externalId: user.sub,
            })
            
            trackServerEvent('polar_customer_auto_created', {
              customer_id: newCustomer.id,
              user_id: user.sub,
              org_id: org.id
            }, userOpts);
            
            const [newCustomerRecord] = await tx.insert(customers).values({
              user_id: user.sub,
              organization_id: org.id,
              polar_customer_id: newCustomer.id,
            }).returning()
            if (!newCustomerRecord) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create customer record.' });
            }
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

        trackServerEvent('org_created', {
          org_id: newOrg.id,
          plan_id: planId,
          user_id: user.sub,
        }, userOpts);

        const checkout = await polar.checkouts.create({
          products: [planId],
          successUrl: `${siteUrl}${polarCheckoutSuccessUrl}`,
          customerEmail: user.email,
          metadata: {
            user_id: user.sub,
            organization_id: newOrg.id,
          },
        });
        checkoutUrl = checkout.url;
      } catch (polarError) {
        trackServerEvent('polar_api_failure', {
          operation: 'organization_create',
          error: polarError instanceof Error ? polarError.message : 'Unknown Polar error'
        }, userOpts);
        console.error('Polar operation failed:', polarError)
        const errorMessage = polarError instanceof Error ? polarError.message : 'Unknown Polar error'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Payment system error: ${errorMessage}`,
        })
      }

      // Sync to Resend audience
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
      );
      
      await supabaseAdmin.functions.invoke('resend-audience-webhook', {
        body: { email: user.email }
      });

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
      const userOpts = { distinctId: user.sub, email: user.email as string }
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

        trackServerEvent('checkout_session_verified', {
          checkout_id: checkoutId,
          org_id: organizationId,
        }, userOpts);
        
        // Set pending to false after successful checkout
        await db.update(organizations).set({ pending: false }).where(eq(organizations.id, organizationId))
        
        trackServerEvent('org_activated', {
          org_id: organizationId,
          activation_method: 'checkout_verification'
        }, userOpts);
        
        return { organizationId }
      } catch (error) {
        trackServerEvent('polar_api_failure', {
          operation: 'checkout_verification',
          checkout_id: checkoutId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, userOpts);
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
        plan_change: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, productId, plan_change } = input;
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
            user_id: user.sub,
            organization_id: organizationId,
            plan_change: plan_change ?? true,
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
          eq(memberships.user_id, user.sub),
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
        where: eq(memberships.user_id, user.sub),
        with: {
          organization: {
            with: {
              subscriptions: {
                where: (s, { or, eq }) => or(eq(s.status, 'active'), eq(s.status, 'trialing')),
              },
            },
          },
        },
      });

      return userMemberships.map((m) => ({
        ...m.organization,
        subscription: (m.organization.subscriptions as Subscription[]).length > 0 ? 'Pro' : null,
      }));
    }),
})
