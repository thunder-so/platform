import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '../../db/db';
import { providers, subscriptions, orders } from '../../db/schema';
import { sql, eq, and, or, isNull } from 'drizzle-orm';
import * as ProviderLibrary from '../../lib/provider.library';
import { PlatformLibrary } from '../../lib/platform.library';
import { trackServerEvent } from '../../utils/analytics';

export const providersRouter = router({
  addManualProvider: protectedProcedure
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

      // Check free plan limits
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organization_id, organizationId),
          or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing'))
        )
      });

      if (subscription && (subscription.metadata as any)?.prices?.[0]?.amount_type === 'free') {
        const providerCount = await db.select({ count: sql`count(*)` })
          .from(providers)
          .where(and(
            eq(providers.organization_id, organizationId),
            isNull(providers.deleted_at)
          ));
        
        if (Number(providerCount[0]?.count || 0) >= 1) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Free plan is limited to 1 AWS account. Upgrade to add more AWS accounts.',
          });
        }
      }

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
        
        trackServerEvent('aws_credentials_validated', {
          org_id: organizationId,
          account_id: callerIdentity.Account,
          method: 'access_key'
        });
      } catch (error: any) {
        trackServerEvent('aws_credentials_validation_failed', {
          org_id: organizationId,
          method: 'access_key',
          error: error.message
        });
        throw error;
      }

      try {
        // Store secret access key in Supabase Vault using Drizzle raw query
        const secretName = `secret_access_key_${accessKeyId}_${Date.now()}`;
        const vaultResult = await db.execute(sql`
          SELECT vault.create_secret(${secretAccessKey}, ${secretName}, ${`AWS Secret Access Key for organization ${organizationId} and Access Key ID ${accessKeyId}`})
        `);

        const secret_id = vaultResult.rows[0]?.create_secret as string | undefined;

        if (!secret_id) {
          trackServerEvent('secret_storage_failure', {
            org_id: organizationId,
            error: 'vault.create_secret returned false or unexpected value'
          });
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
          trackServerEvent('database_transaction_failed', {
            operation: 'provider_create',
            org_id: organizationId,
            error: 'Drizzle insert returned no data'
          });
          console.error('Error inserting provider: Drizzle insert returned no data');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create provider entry.',
          });
        }

        trackServerEvent('aws_provider_created_server', {
          provider_id: data.id,
          org_id: organizationId,
          account_id: data.account_id,
          method: 'access_key'
        });

        return data;
      } catch (error) {
        trackServerEvent('aws_provider_creation_failed', {
          org_id: organizationId,
          method: 'access_key',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error('Error in addManualProvider:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
        });
      }
    }),
    
  delete: protectedProcedure
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

        trackServerEvent('aws_provider_deleted_server', {
          provider_id: data.id
        });

        return data;
      } catch (error) {
        trackServerEvent('aws_provider_deletion_failed', {
          provider_id: providerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error('Error in deleteProvider:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
        });
      }
    }),
});
