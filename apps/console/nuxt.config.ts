// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      providerStack: process.env.PROVIDER_STACK,
      GITHUB_APP: process.env.GH_APP,
      GITHUB_CLIENT_ID: process.env.GH_CLIENT_ID,
    },
    private: {
      polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
      polarCheckoutSuccessUrl: process.env.POLAR_CHECKOUT_SUCCESS_URL,
      polarServer: process.env.POLAR_SERVER || 'sandbox',
    }
  },
  build: {
    transpile: [
      'trpc-nuxt', 
      '@trpc/client', 
      '@trpc/server',
    ],
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@polar-sh/nuxt',
    '@nuxt/icon'
  ],
  css: ['~/assets/css/main.css'],
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
  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: './assets/icons'
      },
    ],
  },
  nitro: {
    preset: 'aws-lambda',
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
    // inlineDynamicImports: false,
    experimental: {
      wasm: false,
      // legacyExternals: true,
    },
    routeRules: {
      '/api/trpc/**': {
        cors: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    },
    // Exclude
    externals: {
      inline: [
        '@polar-sh/nuxt', 
        // '@polar-sh/sdk',
        '@aws-sdk/client-acm',
        '@aws-sdk/client-cloudwatch-logs',
        '@aws-sdk/client-route-53',
        '@aws-sdk/client-sqs',
        '@aws-sdk/client-ssm',
        '@aws-sdk/client-sts',
        '@aws-sdk/core',
        'perfect-debounce'
      ]
    }
  }
});