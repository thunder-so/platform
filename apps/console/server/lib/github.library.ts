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
     * Github App OAuth Flow 
     * Redirects to callback url with code 
     * Generate user access token (also referred to as user-to-server token)
     * @description https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
     * @param code 
     * @returns access_token
     */
    async exchangeCodeForUserToken(code: string): Promise<any> {
      // Authenticate with the app
      const app = new App({ 
          appId: this.appId as string,
          privateKey: this.privateKey as string
      });

      try {
          const response = await app.octokit.request('POST /login/oauth/access_token', {
              baseUrl: 'https://github.com',
              client_id: this.clientId,
              client_secret: this.clientSecret,
              code: code,
              headers: {
                  "Accept": "application/vnd.github+json",
                  "X-GitHub-Api-Version": "2022-11-28",
                  "User-Agent": "thunder-so"
              }
          });
          
          const data = response.data;
          if (data.error) {
              throw new Error(data.error);
          }
          
          return {
              access_token: data.access_token
          }
      }
      catch (error) {
          throw error;
      }
    }
}