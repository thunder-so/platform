import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { sql, eq } from 'drizzle-orm';
import { applications, environments, services, serviceVariables, userAccessTokens, destroys, type Service, type Environment, type Provider, type UserAccessToken } from '~/server/db/schema';
import { applicationInputSchema } from '~/server/validators/new';
import { PlatformLibrary } from '~/server/lib/platform.library';
import * as ProviderLibrary from '~/server/lib/provider.library';

export const applicationsRouter = router({
  update: protectedProcedure
    .input(
      z.object({
        application_id: z.string(),
        display_name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { application_id, ...data } = input;
      return await db.update(applications).set(data).where(eq(applications.id, application_id)).returning();
    }),

  create: protectedProcedure
    .input(applicationInputSchema.extend({
      organization_id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { name, display_name, environments: inputEnvironments } = input;

      const { newApplicationId, newServiceId } = await db.transaction(async (tx) => {
        const [newApplication] = await tx.insert(applications).values({
          name,
          display_name,
          organization_id: input.organization_id,
          status: 'CONFIGURED',
        }).returning();

        if (!newApplication) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create application entry.' });
        }

        const env = inputEnvironments[0];
        const service = env.services[0];

        if (!env.provider) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Environment is missing provider details.' });
        }

        const [newEnvironment] = await tx.insert(environments).values({
          name: env.name,
          display_name: env.display_name,
          application_id: newApplication.id,
          provider_id: env.provider.id,
          region: env.region,
        }).returning();

        const vaultSecretId = env.user_access_token?.secret_id;
        if (!vaultSecretId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'User Access Token is missing.' });
        }

        const tokenResult = await tx.execute(sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${vaultSecretId}::uuid`);
        const decryptedToken = tokenResult.rows[0]?.decrypted_secret as string | undefined;
        if (!decryptedToken) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to decrypt GitHub access token.' });
        }

        const secretName = `thunder/${newApplication.id}/${newEnvironment.id}/github-token`;
        const accessTokenSecretArn = await ProviderLibrary.createOrUpdateSecret(
          env.provider,
          secretName,
          decryptedToken,
          `GitHub User Access Token for application ${newApplication.name} in environment ${newEnvironment.name}`
        );

        await tx.update(userAccessTokens)
          .set({ environment_id: newEnvironment.id, resource: accessTokenSecretArn })
          .where(eq(userAccessTokens.secret_id, vaultSecretId));

        const [newService] = await tx.insert(services).values({
          name: service.name,
          display_name: service.display_name,
          stack_type: service.stack_type,
          stack_version: service.stack_version,
          installation_id: service.installation_id,
          environment_id: newEnvironment.id,
          owner: service.owner,
          repo: service.repo,
          branch: service.branch,
          metadata: service.metadata,
        }).returning();

        if (service.service_variables && service.service_variables.length > 0) {
          await tx.insert(serviceVariables).values(
            service.service_variables.map(v => ({
              key: v.key,
              value: v.value,
              type: v.type,
              service_id: newService.id,
            }))
          );
        }

        return { newApplicationId: newApplication.id, newServiceId: newService.id };
      });

      const platform = new PlatformLibrary();
      await platform.triggerBuild(newServiceId);

      return { newApplicationId };
    }),

  delete: protectedProcedure
    .input(z.object({
      application_id: z.string(),
      service_id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { application_id, service_id } = input;

      // Use exported DB types and cast the query result so nested relations
      type ServiceWithRelations = Service & {
        environment?: (Environment & { provider?: Provider; userAccessTokens?: UserAccessToken[] }) | null;
      };

      const service = await db.query.services.findFirst({
        where: eq(services.id, service_id),
        with: {
          environment: {
            with: {
              provider: true,
              userAccessTokens: true,
            },
          },
        },
      }) as ServiceWithRelations | null;

      if (!service || !service.environment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service or environment not found.' });
      }

      const { environment } = service;
      const { provider, userAccessTokens: uats } = environment;
      const accessTokenSecretArn = uats?.[0]?.resource;

      if (!accessTokenSecretArn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Access token secret ARN not found.' });
      }

      const props = {
        ...service.metadata,
        owner: service.owner,
        repo: service.repo,
        branch: service.branch,
        env: {
          account: provider?.account_id,
          region: environment.region,
        },
        application: application_id,
        service: service.name,
        environment: environment.name,
      };

      const [newDestroy] = await db.insert(destroys).values({
        service_id: service.id,
        environment_id: environment.id,
        destroy_status: 'IN_PROGRESS',
        destroy_context: props,
      }).returning({ id: destroys.id });

      if (!newDestroy) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create destroy entry.' });
      }

      try {
        const messageAttributes = {
          command: { DataType: 'String', StringValue: 'delete' },
          stackType: { DataType: 'String', StringValue: service.stack_type },
          stackVersion: { DataType: 'String', StringValue: service.stack_version },
          eventId: { DataType: 'String', StringValue: newDestroy.id },
          accessTokenSecretArn: { DataType: 'String', StringValue: accessTokenSecretArn },
          provider: { DataType: 'String', StringValue: JSON.stringify(provider) },
        };

        const runnerServiceQueueUrl = process.env.RUNNER_SERVICE;
        if (!runnerServiceQueueUrl) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Runner SQS queue URL is not configured.' });
        }

        const platform = new PlatformLibrary();
        await platform.sendSqsMessage(runnerServiceQueueUrl, JSON.stringify(props), newDestroy.id, messageAttributes);

        // Soft-delete the service, environment, and application right after
        // the delete request is sent. Use a transaction to keep updates atomic.
        try {
          await db.transaction(async (tx) => {
            await tx.update(serviceVariables).set({ deleted_at: new Date() }).where(eq(serviceVariables.service_id, service.id));
            await tx.update(services).set({ deleted_at: new Date() }).where(eq(services.id, service.id));
            await tx.update(environments).set({ deleted_at: new Date() }).where(eq(environments.id, environment.id));
            await tx.update(applications).set({ deleted_at: new Date() }).where(eq(applications.id, application_id));
          });
        } catch (updateErr) {
          console.error('Failed to soft-delete resources after delete request:', updateErr);
          // Don't block the delete flow if soft-delete fails; report success but log the error.
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Zod validation error creating build request:', error.flatten());
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to construct a valid build request.', cause: error });
        }
        console.error('Unknown error creating build request:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
      }

      return { success: true };
    }),
});