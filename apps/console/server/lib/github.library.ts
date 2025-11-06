import { App } from "@octokit/app";
import type { Endpoints, OctokitResponse } from "@octokit/types";
import type { Branch } from '../db/schema';

type GetInstallationMetadata = Endpoints['GET /user/installations']['response'];
type GetInstallationRepositoriesResponse = Endpoints['GET /installation/repositories']['response'];
type ListBranchesResponse = Endpoints['GET /repos/{owner}/{repo}/branches']['response'];
type GetRepoResponse = Endpoints['GET /repos/{owner}/{repo}']['response'];
type GetContentResponse = Endpoints['GET /repos/{owner}/{repo}/contents/{path}']['response'];
type ListCommitsResponse = Endpoints['GET /repos/{owner}/{repo}/commits']['response'];

export default class GithubLibrary {
    private appId = process.env.GITHUB_APP_ID;
    private privateKey = this.base64decode(process.env.GITHUB_PRIVATE_KEY);
    private clientId = process.env.GH_CLIENT_ID;
    private clientSecret = process.env.GITHUB_CLIENT_SECRET;

    private base64decode(key: string | undefined): string {
        if (!key) return '';
        
        try {
            return Buffer.from(key, 'base64').toString('utf-8');
        } catch {
            return key.replace(/\\n/g, '\n');
        }
    }

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
     * @returns Object with installation IDs as keys and their repositories as values (archived repos filtered out)
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
            // Filter out archived repositories
            const activeRepositories = response.data.repositories.filter(repo => !repo.archived);
            return { installation_id, repositories: activeRepositories };
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
     * Get branches for a repository
     * @param owner string
     * @param repo string
     * @param installation_id number
     * @returns Array of branches with a marker for the default branch
     */
    async getBranches(
      owner: string,
      repo: string,
      installation_id: number
    ): Promise<Branch[]> {
      const app = new App({
        appId: this.appId as string,
        privateKey: this.privateKey as string
      });

      const octokit = await app.getInstallationOctokit(installation_id);

      // Get repository details to find the default branch
      const repoDetails: OctokitResponse<GetRepoResponse['data']> = await octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      const defaultBranch = repoDetails.data.default_branch;

      // List all branches
      const branchesResponse: OctokitResponse<ListBranchesResponse['data']> = await octokit.request('GET /repos/{owner}/{repo}/branches', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      const branches = branchesResponse.data;

      // Map branches and mark the default one
      const result: Branch[] = branches.map(branch => ({
        name: branch.name,
        commit: branch.commit,
        protected: branch.protected,
        is_default: branch.name === defaultBranch
      }));

      return result;
    }

    /**
     * Get commits for a repository branch
     * @param owner string
     * @param repo string
     * @param branch string
     * @param installation_id number
     * @returns Array of commits
     */
    async getCommits(
      owner: string,
      repo: string,
      branch: string,
      installation_id: number
    ): Promise<ListCommitsResponse['data']> {
      const app = new App({
        appId: this.appId as string,
        privateKey: this.privateKey as string
      });

      const octokit = await app.getInstallationOctokit(installation_id);

      const commitsResponse: OctokitResponse<ListCommitsResponse['data']> = await octokit.request('GET /repos/{owner}/{repo}/commits', {
        owner,
        repo,
        sha: branch,
        per_page: 10,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      return commitsResponse.data;
    }

    async getFileContent(
      owner: string,
      repo: string,
      installation_id: number,
      path: string
    ): Promise<string | null> {
      const app = new App({
        appId: this.appId as string,
        privateKey: this.privateKey as string
      });
      const octokit = await app.getInstallationOctokit(installation_id);

      try {
        const response: GetContentResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner,
          repo,
          path,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        if (!Array.isArray(response.data) && response.data.type === 'file') {
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          return content;
        }
        return null;
      } catch (error: any) {
        if (error.status === 404) {
          return null;
        }
        throw error;
      }
    }

    async checkFileExists(
      owner: string,
      repo: string,
      installation_id: number,
      path: string
    ): Promise<boolean> {
      const app = new App({
        appId: this.appId as string,
        privateKey: this.privateKey as string
      });
      const octokit = await app.getInstallationOctokit(installation_id);

      try {
        await octokit.request('HEAD /repos/{owner}/{repo}/contents/{path}', {
          owner,
          repo,
          path,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        return true;
      } catch (error: any) {
        if (error.status === 404) {
          return false;
        }
        throw error;
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