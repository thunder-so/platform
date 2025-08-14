
import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { sql, eq } from 'drizzle-orm';
import { applications, environments, services, userAccessTokens, builds, providers } from '~/server/db/schema';
import { PlatformLibrary } from '~/server/lib/platform.library';
import * as ProviderLibrary from '~/server/lib/provider.library';
import type { BuildRequest } from '@thunder/types';
import { 
  appPropsSchema, 
  spaMetadataSchema, 
  functionMetadataSchema, 
  webServiceMetadataSchema, 
  spaDomainPropsSchema, 
  functionDomainPropsSchema, 
  webServiceDomainPropsSchema, 
  spaPipelinePropsSchema, 
  functionPipelinePropsSchema, 
  webServicePipelinePropsSchema, 
  edgePropsSchema, 
  cloudFrontPropsSchema 
} from '~/server/trpc/schemas';

// Zod schema for a single service, mirroring the discriminated union in schema.ts
const serviceSchema = z.discriminatedUnion('stack_type', [
  z.object({
    stack_type: z.literal('SPA'),
    name: z.string(),
    display_name: z.string(),
    stack_version: z.string().optional(),
    installation_id: z.number(),
    app_props: appPropsSchema.nullable().optional(),
    pipeline_props: spaPipelinePropsSchema.nullable().optional(),
    metadata: spaMetadataSchema.nullable().optional(),
    domain_props: spaDomainPropsSchema.nullable().optional(),
    edge_props: edgePropsSchema.nullable().optional(),
    cdn_props: cloudFrontPropsSchema.nullable().optional(),
  }),
  z.object({
    stack_type: z.literal('FUNCTION'),
    name: z.string(),
    display_name: z.string(),
    stack_version: z.string().optional(),
    installation_id: z.number(),
    app_props: appPropsSchema.nullable().optional(),
    pipeline_props: functionPipelinePropsSchema.nullable().optional(),
    metadata: functionMetadataSchema.nullable().optional(),
    domain_props: functionDomainPropsSchema.nullable().optional(),
    edge_props: edgePropsSchema.nullable().optional(),
    cdn_props: cloudFrontPropsSchema.nullable().optional(),
  }),
  z.object({
    stack_type: z.literal('WEB_SERVICE'),
    name: z.string(),
    display_name: z.string(),
    stack_version: z.string().optional(),
    installation_id: z.number(),
    app_props: appPropsSchema.nullable().optional(),
    pipeline_props: webServicePipelinePropsSchema.nullable().optional(),
    metadata: webServiceMetadataSchema.nullable().optional(),
    domain_props: webServiceDomainPropsSchema.nullable().optional(),
    edge_props: edgePropsSchema.nullable().optional(),
    cdn_props: cloudFrontPropsSchema.nullable().optional(),
  }),
]);

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
      const { name, display_name, environments: inputEnvironments } = input.applicationInputSchema;
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
          const [newEnvironment] = await tx.insert(environments).values({
            name: env.name,
            display_name: env.display_name,
            application_id: newApplication.id,
            provider_id: env.provider_id,
            region: env.region,
          }).returning({ id: environments.id, name: environments.name });

          const providerDetails = await tx.query.providers.findFirst({ where: eq(providers.id, env.provider_id) });
          if (!providerDetails) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found.' });
          }

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
            }).returning({ id: services.id, name: services.name });

            const [newBuild] = await tx.insert(builds).values({
              service_id: newService.id,
              environment_id: newEnvironment.id,
              build_status: 'IN_PROGRESS',
            }).returning({ id: builds.id });

            if (!newBuild) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create build entry.' });
            }

            const baseContext = {
              env: { account: providerDetails.account_id || '', region: env.region },
              application: newApplication.name,
              service: newService.id,
              environment: newEnvironment.name,
              rootDir: service.app_props?.rootDir || './',
              sourceProps: service.pipeline_props?.sourceProps || { owner: '', repo: '', branchOrRef: '' },
              accessTokenSecretArn: accessTokenSecretArn || '',
              eventTarget: service.pipeline_props?.eventBus,
              buildSpecFilePath: service.pipeline_props?.buildSpecFilePath,
              debug: service.app_props?.debug,
            };

            let buildRequest: BuildRequest;

            const providerForRequest = {
              roleArn: providerDetails.role_arn || '',
              organizationId: providerDetails.organization_id,
              accountId: providerDetails.account_id || '',
              region: env.region,
              accessKeyId: providerDetails.access_key_id || undefined,
            };

            switch (service.stack_type) {
              case 'SPA':
                buildRequest = {
                  stackType: 'SPA',
                  eventId: newBuild.id,
                  provider: providerForRequest,
                  stackVersion: service.stack_version || 'latest',
                  context: {
                    ...baseContext,
                    ...service.app_props,
                    ...service.metadata,
                    ...service.domain_props,
                    ...service.cdn_props,
                    ...service.edge_props,
                    buildProps: service.pipeline_props?.buildProps,
                  },
                };
                break;
              case 'FUNCTION':
                buildRequest = {
                  stackType: 'FUNCTION',
                  eventId: newBuild.id,
                  provider: providerForRequest,
                  stackVersion: service.stack_version || 'latest',
                  context: {
                    ...baseContext,
                    ...service.app_props,
                    functionProps: service.metadata,
                    ...service.domain_props,
                    buildProps: service.pipeline_props?.buildProps,
                  },
                };
                break;
              case 'WEB_SERVICE':
                buildRequest = {
                  stackType: 'WEB_SERVICE',
                  eventId: newBuild.id,
                  provider: providerForRequest,
                  stackVersion: service.stack_version || 'latest',
                  context: {
                    ...baseContext,
                    ...service.app_props,
                    serviceProps: service.metadata,
                    ...service.domain_props,
                    ...service.cdn_props,
                    buildProps: service.pipeline_props?.buildProps,
                  },
                };
                break;
              default:
                throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid stack type` });
            }

            const runnerServiceQueueUrl = process.env.RUNNER_SERVICE;
            if (!runnerServiceQueueUrl) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Runner SQS queue URL is not configured.' });
            }

            await aws.sendSqsMessage(runnerServiceQueueUrl, JSON.stringify(buildRequest), buildRequest.eventId);
          }
        }

        return newApplication.id;
      });

      return { newApplicationId };
    }),
});
