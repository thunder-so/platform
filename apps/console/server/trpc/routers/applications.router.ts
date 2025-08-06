import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { sql, eq } from 'drizzle-orm';
import { applications, environments, services, userAccessTokens, builds, providers } from '~/server/db/schema';
import { PlatformLibrary } from '~/server/lib/platform.library';
import * as ProviderLibrary from '~/server/lib/provider.library';
import type { BuildRequest } from '@thunder/types';
import { appPropsSchema, pipelinePropsSchema, functionPropsSchema, webServicePropsSchema, domainPropsSchema, edgePropsSchema } from '~/server/trpc/schemas';

const serviceSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  stack_type: z.string(),
  stack_version: z.string().optional(),
  installation_id: z.number(),
  app_props: appPropsSchema.nullable().optional(),
  pipeline_props: pipelinePropsSchema.nullable().optional(),
  metadata: z.union([functionPropsSchema, webServicePropsSchema]).nullable().optional(),
  domain_props: domainPropsSchema.nullable().optional(),
  edge_props: edgePropsSchema.nullable().optional(),
});

const environmentSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  provider_id: z.string(),
  region: z.string(),
  user_access_token: z.any().optional(),
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

      const aws = new PlatformLibrary();

      try {
        const newApplicationId = await db.transaction(async (tx) => {
          const [newApplication] = await tx.insert(applications).values({
            name,
            display_name,
            organization_id: input.organization_id,
            status: 'CONFIGURED',
          }).returning({ id: applications.id, name: applications.name });

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
            }).returning({ id: environments.id, name: environments.name });

            // Fetch provider details
            const providerDetails = await tx.query.providers.findFirst({
              where: eq(providers.id, env.provider_id),
            });

            if (!providerDetails) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Provider not found.',
              });
            }

            // Decrypt the GitHub token from the vault
            const vaultSecretId = env.user_access_token.secret_id;
            const tokenResult = await tx.execute(sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${vaultSecretId}::uuid`);
            const decryptedToken = tokenResult.rows[0]?.decrypted_secret as string | undefined;

            if (!decryptedToken) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to decrypt GitHub access token from vault.',
              });
            }

            // Create or update the secret in the provider's AWS account, using the provider's credentials
            const secretName = `thunder/${newApplication.id}/${newEnvironment.id}/github-token`;
            const accessTokenSecretArn = await ProviderLibrary.createOrUpdateSecret(
              providerDetails,
              secretName,
              decryptedToken,
              `GitHub User Access Token for application ${newApplication.name} in environment ${newEnvironment.name}`
            );

            // Update the user_access_token record with the AWS Secret ARN
            await tx.update(userAccessTokens)
              .set({ 
                environment_id: newEnvironment.id,
                resource: accessTokenSecretArn 
              })
              .where(eq(userAccessTokens.secret_id, env.user_access_token.secret_id));

            for (const service of env.services) {
              const [newService] = await tx.insert(services).values({
                name: service.name,
                display_name: service.display_name,
                stack_type: service.stack_type as any,
                stack_version: service.stack_version,
                installation_id: service.installation_id,
                environment_id: newEnvironment.id,
                app_props: service.app_props,
                pipeline_props: service.pipeline_props,
                metadata: service.metadata,
                domain_props: service.domain_props,
                edge_props: service.edge_props,
              }).returning({ id: services.id, name: services.name });

              // Create a new build entry
              const [newBuild] = await tx.insert(builds).values({
                service_id: newService.id,
                environment_id: newEnvironment.id,
                build_status: 'IN_PROGRESS',
              }).returning({ id: builds.id });

              if (!newBuild) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Failed to create build entry.',
                });
              }

              // Construct BuildRequest
              let props: any;
              switch (service.stack_type) {
                case 'SPA':
                  props = {
                    outputDir: service.app_props?.outputDir,
                    buildProps: service.pipeline_props?.buildProps,
                    domain: service.domain_props,
                    cdn: {},
                    edge: service.edge_props,
                  };
                  break;
                case 'LAMBDA':
                  props = {
                    functionProps: {
                      dockerFile: (service.metadata as any)?.dockerFile || 'Dockerfile',
                      timeout: (service.metadata as any)?.timeout,
                      memorySize: (service.metadata as any)?.memorySize,
                      keepWarm: (service.metadata as any)?.keepWarm,
                    },
                    buildProps: service.pipeline_props?.buildProps,
                    domain: service.domain_props,
                  };
                  break;
                case 'ECS':
                  props = {
                    serviceProps: {
                      port: (service.metadata as any)?.port,
                      dockerFile: (service.metadata as any)?.dockerFile,
                      cpu: (service.metadata as any)?.cpu,
                      memorySize: (service.metadata as any)?.memorySize,
                      desiredCount: (service.metadata as any)?.desiredCount,
                    },
                    buildProps: service.pipeline_props?.buildProps,
                    domain: service.domain_props,
                    cdn: {},
                  };
                  break;
                default:
                  throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid stack type: ${service.stack_type}` });
              }

              const buildRequest: BuildRequest = {
                eventId: newBuild.id,
                provider: {
                  roleArn: providerDetails.role_arn || '',
                  externalId: input.organization_id,
                  accountId: providerDetails.account_id || '',
                  region: env.region,
                  accessKeyId: providerDetails.access_key_id || undefined,
                },
                stackVersion: service.stack_version || 'latest',
                env: {
                  account: providerDetails.account_id || '',
                  region: env.region,
                },
                application: newApplication.name,
                service: newService.id,
                environment: newEnvironment.name,
                rootDir: service.app_props?.rootDir || './',
                sourceProps: {
                  owner: service.pipeline_props?.sourceProps?.owner || '',
                  repo: service.pipeline_props?.sourceProps?.repo || '',
                  branchOrRef: service.pipeline_props?.sourceProps?.branchOrRef || '',
                },
                accessTokenSecretArn: accessTokenSecretArn || '',
                stackType: service.stack_type as any,
                props: props,
              };

              // Send SQS message
              const runnerServiceQueueUrl = process.env.RUNNER_SERVICE;
              if (!runnerServiceQueueUrl) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Runner service SQS queue URL is not configured.',
                });
              }

              try {
                await aws.sendSqsMessage(runnerServiceQueueUrl, JSON.stringify(buildRequest), buildRequest.eventId);
                console.log('SQS message sent successfully:', JSON.stringify(buildRequest));
              } catch (sqsError) {
                console.error('Failed to send SQS message:', sqsError);
                await tx.update(builds).set({ build_status: 'FAILED' }).where(eq(builds.id, newBuild.id));
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Failed to initiate build process.',
                });
              }
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