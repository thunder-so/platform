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
          userId: ctx.user.id,
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
});