import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { sql, eq } from 'drizzle-orm';
import { applications, environments, services, userAccessTokens, builds, providers } from '~/server/db/schema';
import { AwsLibrary } from '~/server/lib/aws.library';
import type { BuildRequest } from '@thunder/types/build';
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
  user_access_token: z.any().optional(), // Made optional to match schema.ts
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

      const aws = new AwsLibrary(); // Instantiate AwsLibrary for internal SQS

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

            if (env.user_access_token) {
              await tx.update(userAccessTokens)
                .set({ environment_id: newEnvironment.id })
                .where(eq(userAccessTokens.secret_id, env.user_access_token.secret_id));
            }

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
                build_status: 'NULL',
              }).returning({ id: builds.id });

              if (!newBuild) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Failed to create build entry.',
                });
              }

              // Fetch user access token ARN if available
              let accessTokenSecretArn: string | undefined;
              if (env.user_access_token) {
                const userAccessToken = await tx.query.userAccessTokens.findFirst({
                  where: eq(userAccessTokens.secret_id, env.user_access_token.secret_id),
                });
                accessTokenSecretArn = userAccessToken?.resource || undefined;
              }

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

              // Construct BuildRequest
              const buildRequest: BuildRequest = {
                eventId: newBuild.id,
                provider: {
                  roleArn: providerDetails.role_arn || '',
                  externalId: input.organization_id,
                  accountId: providerDetails.account_id || '',
                  region: env.region,
                  accessKeyId: providerDetails.access_key_id || undefined,
                },
                env: {
                  account: providerDetails.account_id || '',
                  region: env.region,
                },
                application: newApplication.name,
                service: newService.name,
                environment: newEnvironment.name,
                accessTokenSecretArn: accessTokenSecretArn || '',
                sourceProps: {
                  owner: service.pipeline_props?.sourceProps?.owner || '',
                  repo: service.pipeline_props?.sourceProps?.repo || '',
                  branchOrRef: service.pipeline_props?.sourceProps?.branchOrRef || '',
                },
                buildProps: service.pipeline_props?.buildProps || undefined,
                stackType: service.stack_type as any,
                stackVersion: service.stack_version || 'latest',
                serviceProps: {
                  rootDir: service.app_props?.rootDir || '',
                  outputDir: service.app_props?.outputDir || undefined,
                  redirects: service.edge_props?.redirects || undefined,
                  rewrites: service.edge_props?.rewrites || undefined,
                  headers: service.edge_props?.headers || undefined,
                  dockerFile: (service.metadata as any)?.dockerFile || undefined,
                  memorySize: (service.metadata as any)?.memorySize || undefined,
                  handler: (service.metadata as any)?.handler || undefined,
                  timeout: (service.metadata as any)?.timeout || undefined,
                  keepWarm: (service.metadata as any)?.keepWarm || undefined,
                  port: (service.metadata as any)?.port || undefined,
                  desiredCount: (service.metadata as any)?.desiredCount || undefined,
                  cpu: (service.metadata as any)?.cpu || undefined,
                },
                domainProps: service.domain_props || undefined,
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
                await aws.sendSqsMessage(runnerServiceQueueUrl, JSON.stringify(buildRequest));
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