// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      providerStack: process.env.PROVIDER_STACK,
    },
    private: {
      polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
      polarCheckoutSuccessUrl: process.env.POLAR_CHECKOUT_SUCCESS_URL,
      polarServer: process.env.POLAR_SERVER || 'sandbox',
      polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    }
  },
  build: {
    transpile: ['trpc-nuxt', '@trpc/client', '@trpc/server'],
  },
  modules: [
    '@nuxt/ui', 
    '@nuxtjs/tailwindcss', 
    '@nuxtjs/supabase', 
    '@polar-sh/nuxt',
    '@pinia/nuxt'
  ],
  modulesDir: [
    join(currentDir, '../../node_modules'), 
    join(currentDir, './node_modules')
  ],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/confirm', '/invite'],
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        // flowType: 'implicit',
        detectSessionInUrl: true,
        // persistSession: false, // recommended for lambda
        persistSession: process.env.NODE_ENV === 'development' ? true : false,
        autoRefreshToken: true
      }
    },
    cookieOptions: {
      domain: process.env.NODE_ENV === 'development' ? undefined : '.thunder.so',
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'development',
      path: '/'
    }
  },
  // trpc: {
  //   baseUrl: '/api/trpc',
  //   transformer: 'superjson',
  // },
  nitro: {
    preset: 'aws-lambda',
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
    experimental: {
      wasm: true
    },
    // Exclude
    externals: {
      inline: []
    }
  }
});