import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { installations, userAccessTokens } from '~/server/db/schema';
import { sql, eq } from 'drizzle-orm';
import GithubLibrary from '~/server/lib/github.library';

export const githubRouter = router({
    handleAppInstallationFlow: protectedProcedure
      .input(z.object({ 
        installation_id: z.number()
      }))
      .query(async ({ ctx, input }) => {
        const githubLibrary = new GithubLibrary();
        const metadata = await githubLibrary.getInstallationMetadata(input.installation_id)
        
        if (!metadata) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Installation metadata not found'
          });
        }

        const [installation] = await db.insert(installations).values({
          user_id: ctx.user.id,
          installation_id: input.installation_id,
          metadata: metadata,
        }).returning();

        if (!installation) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to store installation data.'
          });
        }

        return installation
      }),

    getInstallationRepositories: protectedProcedure
      .input(z.object({
        installation_ids: z.array(z.number()),
      }))
      .query(async ({ ctx, input }) => {
        const githubLibrary = new GithubLibrary();
        const repositories = await githubLibrary.getRepositories(input.installation_ids);
        
        if (!repositories) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Repositories not found for this installation.'
          });
        }

        return repositories;
      }),

    handleOAuthFlow: protectedProcedure
      .input(z.object({ 
        code: z.string(), 
        environment_id: z.string(), 
      }))
      .mutation(async ({ ctx, input }) => {
        const githubLibrary = new GithubLibrary();
        
        try {
          const { access_token } = await githubLibrary.exchangeCodeForUserToken(input.code);
          
          if (!access_token) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Failed to exchange code for access token'
            });
          }

          const existingToken = await db.select({ secret_id: userAccessTokens.secret_id })
            .from(userAccessTokens)
            .where(eq(userAccessTokens.environment_id, input.environment_id))
            .limit(1);

          if (existingToken.length === 0) {
            // @ts-expect-error
            const [{ create_secret }] = await db.execute(
              sql`SELECT vault.create_secret(${access_token}) as create_secret`
            );

            await db.insert(userAccessTokens).values({
              secret_id: create_secret,
              user_id: ctx.user.id,
              environment_id: input.environment_id
            });
          } else {
            await db.execute(sql`SELECT vault.update_secret(${existingToken[0].secret_id}, ${access_token})`);
          }

          return { success: true };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'OAuth flow failed'
          });
        }
      }),

});