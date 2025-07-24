import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { installations } from '~/server/db/schema';
import { sql } from 'drizzle-orm';
import { Octokit } from '@octokit/core';
import { App } from "@octokit/app";
import type { Endpoints, OctokitResponse } from "@octokit/types";
import { createAppAuth } from "@octokit/auth-app";

type GetInstallationMetadata = Endpoints['GET /user/installations']['response'];
type GetInstallationRepositoriesResponse = Endpoints['GET /installation/repositories']['response'];

export default class GithubLibrary {
    private appId = process.env.GITHUB_APP_ID;
    private privateKey = process.env.GITHUB_PRIVATE_KEY;
    private clientId = process.env.GH_CLIENT_ID;
    private clientSecret = process.env.GITHUB_CLIENT_SECRET;

    /**
     * Get installation metadata from Octokit
     * @param installation_id number
     * @returns 
     */
    async getInstallationMetadata(installation_id: number): Promise<GetInstallationMetadata['data']> {
      const app = new App({ 
        appId: this.appId as string, 
        privateKey: this.privateKey as string
      });

      const octokit = await app.getInstallationOctokit(installation_id);

      const metadata: OctokitResponse<GetInstallationMetadata["data"], number> = await octokit.request(`GET /app/installations/${installation_id}`, {
        installation_id,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      return metadata?.data;
    }

    /**
     * Get repositories from multiple installations in a single call
     * @param installation_ids Array of installation IDs
     * @returns Object with installation IDs as keys and their repositories as values
     */
    async getRepositories(
      installation_ids: number[]
    ): Promise<Record<number, GetInstallationRepositoriesResponse['data']['repositories']>> {
      try {
        // Create a single App instance
        const app = new App({
          appId: this.appId as string,
          privateKey: this.privateKey as string
        });
        
        // Use Promise.all to fetch repositories for all installations in parallel
        const results = await Promise.all(
          installation_ids.map(async (installation_id) => {
            const octokit = await app.getInstallationOctokit(installation_id);
            const response = await octokit.request("GET /installation/repositories", {
              headers: {
                'X-GitHub-Api-Version': '2022-11-28'
              }
            });
            return { installation_id, repositories: response.data.repositories };
          })
        );
        
        // Convert the results array to an object with installation_id as keys
        return results.reduce((acc, { installation_id, repositories }) => {
          acc[installation_id] = repositories;
          return acc;
        }, {} as Record<number, GetInstallationRepositoriesResponse['data']['repositories']>);
      } 
      catch (error) {
        throw error as Error;
      }
    }

    /**
     * Get list of repositories using Github App installation
     * @description https://github.com/octokit/auth-app.js?tab=readme-ov-file#usage-with-octokit
     * @param installation_id 
     * @returns octokit.response [total_count, repositories]
     */
    // async getRepositories(installation_id: number): Promise<GetInstallationRepositoriesResponse['data']> {
    //   try {
    //     const octokit = new Octokit({
    //       authStrategy: createAppAuth,
    //       auth: {
    //         appId: this.appId,
    //         privateKey: this.privateKey,
    //         installationId: installation_id
    //       }
    //     });

    //     const response: OctokitResponse<GetInstallationRepositoriesResponse['data'], number> = await octokit.request("GET /installation/repositories", {})

    //     return response.data;
    //   } 
    //   catch (error) {
    //     throw error as Error;
    //   } 
    // }
}

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
          installationId: input.installation_id,
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

    // getInstallations: protectedProcedure
    //   .query(async ({ ctx }) => {
    //     const userInstallations = await db.select().from(installations).where(sql`${installations.userId} = ${ctx.user.id}`);
    //     return userInstallations;
    //   }),

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
});