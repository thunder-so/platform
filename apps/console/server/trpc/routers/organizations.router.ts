import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc/init'
import { db } from '~/server/db/db'
import { organizations, memberships } from '~/server/db/schema'
// import { eq } from 'drizzle-orm'

export const organizationsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        planId: z.number(),
      })
    )
    .use(async (opts) => {
      console.log('Raw input received:', opts.input)
      // console.log('Raw context:', opts.ctx)
      return opts.next()
    })
    .mutation(async ({ ctx, input }) => {
      console.log('Organizations.create input:', input)
      const { user } = ctx
      const { name, planId } = input

      // // 1. Create the organization using Drizzle.
      // // Drizzle will auto-generate the cuid2 for the id.
      // const [newOrg] = await db
      //   .insert(organizations)
      //   .values({
      //     name,
      //     planId,
      //   })
      //   .returning()

      // if (!newOrg) {
      //   throw new Error('Could not create organization.')
      // }

      // // 2. Create the membership for the user
      // await db.insert(memberships).values({
      //   organizationId: newOrg.id,
      //   userId: user.id,
      //   access: 'OWNER',
      // })

      // return newOrg
    }),
})


// import { TRPCError } from '@trpc/server';
// import { router, publicProcedure, protectedProcedure } from '../init'; 
// import { ACCOUNT_ACCESS } from '~/prisma/enums.types';
// import Organization from '~/lib/organization.lib';
// import { type PaddleEventData } from '@paddle/paddle-js';
// import { z } from 'zod';

// export const organizationsRouter = router({

//     /**
//      * Organizations
//      * CRUD
//      * 
//      */
//     createOrganization: protectedProcedure
//       .input(z.object({ name: z.string() }))
//       .mutation(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const organization = await organizationLibrary.createOrganization(
//           ctx.user.id as string,
//           input.name
//         );

//         return { organization }
//     }),

//     getOrganizationById: protectedProcedure
//       .input(z.object({ organization_id: z.string() }))
//       .query(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const organization = await organizationLibrary.getOrganizationById(
//           input.organization_id
//         );
//         ctx.activeOrganizationId = organization.id;

//         return { organization }
//     }),

//     updateOrganizationName: protectedProcedure
//       .input(z.object({ 
//         organization_id: z.string(), 
//         name: z.string(), 
//       }))
//       .mutation(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const organization = await organizationLibrary.updateOrganizationName(
//           input.organization_id,
//           input.name
//         );

//         return { organization }
//     }),

//     deleteOrganization: protectedProcedure
//     .input(z.object({ organization_id: z.string() }))
//     .mutation(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const organization = await organizationLibrary.deleteOrganization(
//             input.organization_id
//         );

//         return { organization }
//     }),

//     /**
//      * Plans and Billing
//      * 
//      */
//     updateOrganizationPlan: protectedProcedure
//       .input(z.object({ 
//         organization_id: z.string(), 
//         plan_id: z.number(), 
//       }))
//       .mutation(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const organization = await organizationLibrary.updateOrganizationPlan(
//           input.organization_id,
//           input.plan_id
//         );

//         return { organization }
//     }),

//     completeCheckout: protectedProcedure
//       .input(z.object({ 
//         organization_id: z.string(), 
//         data: z.custom<PaddleEventData>(),
//       }))
//       .mutation(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const payments = await organizationLibrary.completeCheckout(
//           input.organization_id,
//           input.data
//         );

//         const organization = await organizationLibrary.updateOrganizationPlan(
//           input.organization_id,
//           // @ts-expect-error
//           input.data.data?.custom_data?.plan_id
//         );

//         return { organization }
//     }),

//     /**
//      * Providers
//      * 
//      */
//     getProvidersByOrganizationId: protectedProcedure
//     .input(z.object({ 
//       organization_id: z.string()
//     }))
//     .query(async ({ ctx, input }) => {
//       const organizationLibrary = new Organization();
//       const providers = await organizationLibrary.getProvidersByOrganizationId(
//         input.organization_id,
//       );

//       return { providers }
//     }),
    
//     createProvider: protectedProcedure
//     .input(z.object({ 
//       organization_id: z.string(), 
//       alias: z.string(), 
//     }))
//     .mutation(async ({ ctx, input }) => {
//       const organizationLibrary = new Organization();
//       const provider = await organizationLibrary.createProvider(
//         input.organization_id,
//         input.alias
//       );

//       return { provider }
//     }),

//     deleteProvider: protectedProcedure
//     .input(z.object({ provider_id: z.string() }))
//     .mutation(async ({ ctx, input }) => {
//         const organizationLibrary = new Organization();
//         const provider = await organizationLibrary.deleteProvider(
//             input.provider_id
//         );

//         return { provider }
//     }),

// });
