export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return

  const { $client } = useNuxtApp();
  const query = to.query;

  /**
   * Check for Github App Installation Flow
   * http://localhost:3000/app/create?installation_id=000&setup_action=install&code=000
   * @param installation_id
   * @param setup_action
   * @param code
   */
  if(query.installation_id && query.setup_action === 'install' && query.code) {
    const response = await $client.github.handleAppInstallationFlow.query({ 
      installation_id: Number(query.installation_id as string) 
    });

    if (!response) {
      throw new Error('Something went wrong with the Github App Installation')
    }

    return
  }

  /**
   * Check for Github App OAuth Flow during App Create Flow
   * @param code
   * @param state
   */
    if(query.code && query.state) {
      const { setUat, setOAuthError } = useNewApplicationFlow();
      try {
        const response = await $client.github.handleOAuthFlow.mutate({ 
          code: query.code as string
        });
        if (response?.user_access_token) {
          setUat(response.user_access_token);
          setOAuthError(false);
        } else {
          throw new Error('Failed to retrieve User Access Token');
        }
      } catch (error) {
        setUat(undefined);
        setOAuthError(true);
        console.error('OAuth flow error:', error);
      }
    }
});