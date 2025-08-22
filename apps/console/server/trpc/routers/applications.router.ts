import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { sql, eq } from 'drizzle-orm';
import { applications, environments, services, userAccessTokens, builds } from '~/server/db/schema';
import { applicationInputSchema } from '~/server/db/types';
import { PlatformLibrary } from '~/server/lib/platform.library';
import * as ProviderLibrary from '~/server/lib/provider.library';

export const applicationsRouter = router({
  create: protectedProcedure
    .input(applicationInputSchema.extend({
      organization_id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { name, display_name, environments: inputEnvironments } = input;
      const aws = new PlatformLibrary();

      const newApplicationId = await db.transaction(async (tx) => {
        const [newApplication] = await tx.insert(applications).values({
          name,
          display_name,
          organization_id: input.organization_id,
          status: 'CONFIGURED',
        }).returning({ id: applications.id, name: applications.name });

        if (!newApplication) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create application entry.' });
        }

        for (const env of inputEnvironments) {
          if (!env.provider) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Environment is missing provider details.' });
          }

          const [newEnvironment] = await tx.insert(environments).values({
            name: env.name,
            display_name: env.display_name,
            application_id: newApplication.id,
            provider_id: env.provider.id,
            region: env.region,
          }).returning({ id: environments.id, name: environments.name, region: environments.region });

          const providerDetails = env.provider;

          const vaultSecretId = env.user_access_token.secret_id;
          const tokenResult = await tx.execute(sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${vaultSecretId}::uuid`);
          const decryptedToken = tokenResult.rows[0]?.decrypted_secret as string | undefined;
          if (!decryptedToken) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to decrypt GitHub access token.' });
          }

          const secretName = `thunder/${newApplication.id}/${newEnvironment.id}/github-token`;
          const accessTokenSecretArn = await ProviderLibrary.createOrUpdateSecret(
            providerDetails,
            secretName,
            decryptedToken,
            `GitHub User Access Token for application ${newApplication.name} in environment ${newEnvironment.name}`
          );

          await tx.update(userAccessTokens)
            .set({ environment_id: newEnvironment.id, resource: accessTokenSecretArn })
            .where(eq(userAccessTokens.secret_id, env.user_access_token.secret_id));

          for (const service of env.services) {
            const [newService] = await tx.insert(services).values({
              name: service.name,
              display_name: service.display_name,
              stack_type: service.stack_type,
              stack_version: service.stack_version,
              installation_id: service.installation_id,
              environment_id: newEnvironment.id,
              app_props: service.app_props,
              pipeline_props: service.pipeline_props,
              metadata: service.metadata,
              domain_props: service.domain_props,
              edge_props: service.edge_props,
              cdn_props: service.cdn_props,
            }).returning({ id: services.id, name: services.name, stack_type: services.stack_type, stack_version: services.stack_version });

            const props = {
              ...service.app_props ?? null,
              ...service.pipeline_props ?? null,
              ...service.domain_props ?? null,
              ...service.edge_props ?? null,
              ...service.cdn_props ?? null,
              ...(newService.stack_type === 'FUNCTION' && { functionProps: service.metadata ?? null }),
              ...(newService.stack_type === 'WEB_SERVICE' && { serviceProps: service.metadata ?? null }),
              env: {
                account: providerDetails.account_id,
                region: newEnvironment.region,
              },
              application: newApplication.name,
              service: newService.name,
              environment: newEnvironment.name,
            };

            const [newBuild] = await tx.insert(builds).values({
              service_id: newService.id,
              environment_id: newEnvironment.id,
              build_status: 'IN_PROGRESS',
              build_context: props,
            }).returning({ id: builds.id });

            if (!newBuild) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create build entry.' });
            }

            try {
              const messageAttributes = {
                stackType: { DataType: 'String', StringValue: newService.stack_type },
                stackVersion: { DataType: 'String', StringValue: newService.stack_version },
                eventId: { DataType: 'String', StringValue: newBuild.id },
                accessTokenSecretArn: { DataType: 'String', StringValue: accessTokenSecretArn },
                provider: { DataType: 'String', StringValue: JSON.stringify(providerDetails) },
              };

              const runnerServiceQueueUrl = process.env.RUNNER_SERVICE;
              if (!runnerServiceQueueUrl) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Runner SQS queue URL is not configured.' });
              }

              await aws.sendSqsMessage(runnerServiceQueueUrl, JSON.stringify(props), newBuild.id, messageAttributes);
            } catch (error) {
              if (error instanceof z.ZodError) {
                console.error('Zod validation error creating build request:', error.flatten());
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to construct a valid build request.', cause: error });
              }
              console.error('Unknown error creating build request:', error);
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
            }
          }
        }

        return newApplication.id;
      });

      return { newApplicationId };
    }),
});
