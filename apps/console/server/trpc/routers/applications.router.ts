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

        const secretName = `thunder/${newApplication.name}/${newEnvironment.name}/github-token`;
        const accessTokenSecretArn = await ProviderLibrary.createOrUpdateSecret(
          { ...env.provider, organization_id: input.organization_id },
          secretName,
          decryptedToken,
          `GitHub UAT for app ${newApplication.name} in env ${newEnvironment.name}`,
          env.region
        );
        console.log('Created/Updated secret in provider with ARN:', accessTokenSecretArn);

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

      // const platform = new PlatformLibrary();
      // await platform.triggerBuild(newServiceId);

      return { newApplicationId };
    }),

  delete: protectedProcedure
    .input(z.object({
      application_id: z.string(),
      service_id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { application_id, service_id } = input;

      try {
        const platform = new PlatformLibrary();
        await platform.triggerBuild(service_id, 'delete');
      } catch (err) {
        console.error('Failed to trigger delete build:', err);
        return { success: false, message: 'Failed to trigger delete build.' };
      }

      // Soft-delete the service, environment, and application records
      try {
        await db.transaction(async (tx) => {
          // await tx.update(serviceVariables).set({ deleted_at: new Date() }).where(eq(serviceVariables.service_id, service.id));
          // await tx.update(services).set({ deleted_at: new Date() }).where(eq(services.id, service.id));
          // await tx.update(environments).set({ deleted_at: new Date() }).where(eq(environments.id, environment.id));
          await tx.update(applications).set({ deleted_at: new Date() }).where(eq(applications.id, application_id));
        });
      } catch (updateErr) {
        console.error('Failed to soft-delete resources after delete request:', updateErr);
        return { success: false, message: 'Failed to delete database record.' };
      }

      return { success: true };
    }),
});