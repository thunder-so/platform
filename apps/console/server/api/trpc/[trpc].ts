/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import { createTRPCNuxtHandler } from 'trpc-nuxt/server'
import { createTRPCContext } from '../../trpc/init'
import { appRouter } from '../../trpc/routers'
import { PostHog } from 'posthog-node'

export default createTRPCNuxtHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError(opts) {
    const { error, type, path, input, ctx, req } = opts;
    console.error('api/trpc/[trpc]: Path:', path);
    console.error('api/trpc/[trpc]: Type:', type);
    console.error('api/trpc/[trpc]: Error:', error);
    
    // Track tRPC errors with PostHog
    try {
      const runtimeConfig = useRuntimeConfig();
      
      const posthog = new PostHog(
        runtimeConfig.public.posthogPublicKey,
        { host: runtimeConfig.public.posthogHost }
      );
      
      posthog.capture({
        distinctId: ctx?.user?.id || 'anonymous',
        event: 'trpc_error',
        properties: {
          path,
          type,
          error_message: error.message,
          error_code: error.code
        }
      });
      
      posthog.shutdown();
    } catch (e) {
      // Silently fail analytics
    }
  }
})