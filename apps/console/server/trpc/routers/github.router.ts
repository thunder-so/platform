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
        
        return repositories || {};
      }),

    getBranches: protectedProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        installation_id: z.number(),
      }))
      .query(async ({ input }) => {
        const { owner, repo, installation_id } = input;
        const github = new GithubLibrary();
        const branches = await github.getBranches(owner, repo, installation_id);
        return branches;
      }),

    scanRepository: protectedProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        installation_id: z.number(),
      }))
      .query(async ({ input }) => {
        const { owner, repo, installation_id } = input;
        const github = new GithubLibrary();

        const packageJsonContent = await github.getFileContent(owner, repo, installation_id, 'package.json');
        // console.log('>>>> DEBUG: packageJsonContent is:', packageJsonContent);

        if (!packageJsonContent) {
          return { success: false, message: 'A package.json file was not found at the root of your repository.' };
        }

        const packageJson = JSON.parse(packageJsonContent);

        let runtime_version = '24';
        if (packageJson.engines && packageJson.engines.node) {
            const versionMatch = packageJson.engines.node.match(/\d+/);
            if (versionMatch) {
                runtime_version = versionMatch[0];
            }
        }

        let installcmd = 'npm install';
        const [hasBunLock, hasPnpmLock, hasYarnLock] = await Promise.all([
          github.checkFileExists(owner, repo, installation_id, 'bun.lockb'),
          github.checkFileExists(owner, repo, installation_id, 'pnpm-lock.yaml'),
          github.checkFileExists(owner, repo, installation_id, 'yarn.lock'),
        ]);

        if (hasBunLock) {
          installcmd = 'bun install';
        } else if (hasPnpmLock) {
          installcmd = 'pnpm install';
        } else if (hasYarnLock) {
          installcmd = 'yarn install';
        }

        let buildcmd = '';
        if (packageJson.scripts) {
          if (packageJson.scripts.build) {
            buildcmd = packageJson.scripts.build;
          } else if (packageJson.scripts.generate) {
            buildcmd = packageJson.scripts.generate;
          }
        }

        let startcmd = 'npm start';
        if (hasBunLock) {
          startcmd = 'bun start';
        } else if (hasPnpmLock) {
          startcmd = 'pnpm start';
        } else if (hasYarnLock) {
          startcmd = 'yarn start';
        }

        // console.log(`Detected runtime: ${runtime_version}, install command: ${installcmd}, build command: ${buildcmd}, start command: ${startcmd}`);

        return {
          runtime_version,
          installcmd,
          buildcmd,
          startcmd,
        };
      }),

    scanForDockerfile: protectedProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        installation_id: z.number(),
      }))
      .query(async ({ input }) => {
        const { owner, repo, installation_id } = input;
        const github = new GithubLibrary();

        const hasDockerfile = await github.checkFileExists(owner, repo, installation_id, 'Dockerfile');

        if (!hasDockerfile) {
          return { success: false, message: 'A Dockerfile was not found at the root of your repository. Using Nixpacks build system.' };
        }

        return { success: true };
      }),

    handleOAuthFlow: protectedProcedure
      .input(z.object({ 
        code: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const githubLibrary = new GithubLibrary();
        
        try {
          // Exchange the code for a user access token
          const result = await githubLibrary.exchangeCodeForUserToken(input.code);
          const access_token = result?.access_token;
          
          if (!access_token) {
            throw new Error('Failed to exchange code for access token');
          }

          // Store the user access token in the vault
          const secretName = `access_token_${ctx.user.id}_${Date.now()}`;
          const vaultResult = await db.execute(
            sql`SELECT vault.create_secret(${access_token}, ${secretName}, ${`Github User Access Token for user ${ctx.user.id}`}) as create_secret`
          );

          const create_secret = String(vaultResult.rows[0]?.create_secret);
          if (!create_secret) {
            throw new Error('Failed to create secret in vault')
          }

          // Insert the user access token into the database
          const userAccessTokenResult = await db.insert(userAccessTokens).values({
              secret_id: create_secret,
              user_id: ctx.user.id,
              environment_id: sql`NULL`
            }).returning();

          const user_access_token = userAccessTokenResult?.[0];

          if (!user_access_token) {
            throw new Error('Failed to store user access token');
          }

          return { user_access_token: user_access_token };
        } catch (error) {
          console.error('OAuth flow error:', error);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `OAuth flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            cause: error
          });
        }
      }),

});