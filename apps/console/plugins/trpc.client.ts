import { createTRPCNuxtClient, httpLink, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/server/trpc/routers'
import superjson from 'superjson'

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  
  const trpc = createTRPCNuxtClient<AppRouter>({
    links: [
      httpLink({
        url: '/api/trpc',
        async headers() {          
          const { data: { session } } = await supabase.auth.getSession()
          
          return session?.access_token 
            ? { authorization: `Bearer ${session.access_token}` }
            : {}
        },
        transformer: superjson
      }),
    ],
  })

  return {
    provide: {
      client: trpc,
    },
  }
})