import { z } from 'zod';
import { publicProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { providers } from '~/server/db/schema';
import { sql } from 'drizzle-orm';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

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

      const stsClient = new STSClient({
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });

      let callerIdentity;
      try {
        callerIdentity = await stsClient.send(new GetCallerIdentityCommand({}));
      } catch (error: any) {
        if (error.name === 'InvalidClientTokenId' || error.name === 'SignatureDoesNotMatch') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid AWS credentials provided.',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during credential validation.',
        });
      }

      try {
        // Store secret access key in Supabase Vault using Drizzle raw query
        const secretName = `aws_secret_key_${organizationId}_${accessKeyId}`;
        const vaultSuccess = await db.execute(sql`
          SELECT vault.create_secret(${secretAccessKey}, ${secretName}, ${`AWS Secret Access Key for organization ${organizationId} and Access Key ID ${accessKeyId}`})
        `);

        if (!vaultSuccess) {
          console.error('Error storing secret in vault: vault.create_secret returned false or an unexpected value');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to securely store AWS credentials.',
          });
        }

        // Insert provider details into the providers table using Drizzle
        const [data] = await db
          .insert(providers)
          .values({
            organization_id: organizationId,
            alias: alias,
            access_key_id: accessKeyId,
            account_id: callerIdentity.Account,
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
  // getProvidersByOrganizationId: publicProcedure
  //   .input(z.object({
  //     organizationId: z.string(),
  //   }))
  //   .query(async ({ input }) => {
  //     const { organizationId } = input;
  //     const result = await db.select().from(providers).where(sql`${providers.organizationId} = ${organizationId}`);
  //     return result;
  //   }),
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
