import { z } from 'zod';
import { publicProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { providers } from '~/server/db/schema';
import { sql } from 'drizzle-orm';
import * as ProviderLibrary from '~/server/lib/provider.library';
import { PlatformLibrary } from '~/server/lib/platform.library';

export const providersRouter = router({
  addManualProvider: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        alias: z.string().min(1, 'Alias is required'),
        accessKeyId: z.string().min(1, 'Access Key ID is required'),
        secretAccessKey: z.string().min(1, 'Secret Access Key is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, alias, accessKeyId, secretAccessKey } = input;

      const tempProvider = {
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        alias: alias,
        organization_id: organizationId,
        id: '',
        account_id: '',
        role_arn: null,
        secret_id: null,
        region: null,
        stack_id: null,
        stack_name: null,
        external_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      let callerIdentity;
      try {
        callerIdentity = await ProviderLibrary.getCallerIdentity(tempProvider);
      } catch (error: any) {
        throw error;
      }

      try {
        // Store secret access key in Supabase Vault using Drizzle raw query
        const secretName = `secret_access_key_${organizationId}_${accessKeyId}`;
        const vaultResult = await db.execute(sql`
          SELECT vault.create_secret(${secretAccessKey}, ${secretName}, ${`AWS Secret Access Key for organization ${organizationId} and Access Key ID ${accessKeyId}`})
        `);

        const secret_id = vaultResult.rows[0]?.create_secret as string | undefined;

        if (!secret_id) {
          console.error('Error storing secret in vault: vault.create_secret returned false or an unexpected value');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to securely store AWS credentials.',
          });
        }

        // Create SSM Secure Parameter
        const platform = new PlatformLibrary();
        const ssmParamName = `/thunder/${organizationId}/${accessKeyId}/secretAccessKey`;
        await platform.createSsmSecureParameter(ssmParamName, secretAccessKey);

        // Insert provider details into the providers table using Drizzle
        const [data] = await db
          .insert(providers)
          .values({
            organization_id: organizationId,
            alias: alias,
            access_key_id: accessKeyId,
            account_id: callerIdentity.Account,
            secret_id: secret_id,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        if (!data) {
          console.error('Error inserting provider: Drizzle insert returned no data');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create provider entry.',
          });
        }

        return data;
      } catch (error) {
        console.error('Error in addManualProvider:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
        });
      }
    }),
    
  delete: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { providerId } = input;

      try {
        const [data] = await db
          .update(providers)
          .set({
            deleted_at: new Date(),
          })
          .where(sql`${providers.id} = ${providerId}`)
          .returning({ id: providers.id });

        if (!data) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Provider not found.',
          });
        }

        return data;
      } catch (error) {
        console.error('Error in deleteProvider:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
        });
      }
    }),
});
