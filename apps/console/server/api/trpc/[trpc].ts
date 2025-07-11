/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import { createTRPCNuxtHandler } from 'trpc-nuxt/server'
import { createTRPCContext } from '~/server/trpc/init'
import { appRouter } from '~/server/trpc/routers'

export default createTRPCNuxtHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError(opts) {
    const { error, type, path, input, ctx, req } = opts;
    console.error('api/trpc/[trpc]: Error:', error);
    console.error('api/trpc/[trpc]: Type:', type);
    console.error('api/trpc/[trpc]: Path:', path);
    // console.error('api/trpc/[trpc]: Input:', input);
    // console.error('api/trpc/[trpc]: Context:', ctx);
    // console.error('api/trpc/[trpc]: Req:', req);
  }
})