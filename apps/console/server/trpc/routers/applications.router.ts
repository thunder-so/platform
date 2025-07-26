import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { sql, eq } from 'drizzle-orm';
import { applications, environments, services, userAccessTokens } from '~/server/db/schema';

const serviceSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  stack_type: z.string(),
  installation_id: z.number(),
  app_props: z.any().optional(),
  pipeline_props: z.any().optional(),
  metadata: z.any().optional(),
});

const environmentSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  provider_id: z.string(),
  region: z.string(),
  user_access_token: z.any(),
  services: z.array(serviceSchema),
});

const applicationInputSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  environments: z.array(environmentSchema),
});

export type ApplicationInputSchema = z.infer<typeof applicationInputSchema>;

export const applicationsRouter = router({
  create: protectedProcedure
    .input(z.object({
      organization_id: z.string(),
      applicationInputSchema
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { name, display_name, environments: inputEnvironments } = input.applicationInputSchema;

      try {
        const newApplicationId = await db.transaction(async (tx) => {
          const [newApplication] = await tx.insert(applications).values({
            name,
            display_name,
            organization_id: input.organization_id,
            status: 'PENDING',
          }).returning({ id: applications.id });

          if (!newApplication) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create application entry.',
            });
          }

          for (const env of inputEnvironments) {
            const [newEnvironment] = await tx.insert(environments).values({
              name: env.name,
              display_name: env.display_name,
              application_id: newApplication.id,
              provider_id: env.provider_id,
              region: env.region,
            }).returning({ id: environments.id });

            if (env.user_access_token) {
              await tx.update(userAccessTokens)
                .set({ environment_id: newEnvironment.id })
                .where(eq(userAccessTokens.secret_id, env.user_access_token.secret_id));
            }

            for (const service of env.services) {
              await tx.insert(services).values({
                name: service.name,
                display_name: service.display_name,
                stack_type: service.stack_type as any,
                installation_id: service.installation_id,
                environment_id: newEnvironment.id,
                app_props: service.app_props,
                pipeline_props: service.pipeline_props,
                metadata: service.metadata,
              });
            }
          }

          return newApplication.id;
        });

        return { newApplicationId };
      } catch (error) {
        console.error('Error creating application:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during application creation.',
        });
      }
    }),
});