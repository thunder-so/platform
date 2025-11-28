// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  telemetry: false,
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      providerStack: process.env.PROVIDER_STACK,
      githubApp: process.env.GH_APP,
      githubClientId: process.env.GH_CLIENT_ID,
      posthogHost: process.env.POSTHOG_HOST,
      posthogPublicKey: process.env.POSTHOG_API_KEY || '',
    },
    private: {
      polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
      polarCheckoutSuccessUrl: process.env.POLAR_CHECKOUT_SUCCESS_URL,
      polarServer: process.env.POLAR_SERVER || 'sandbox',
    }
  },
  experimental: {
    externalVue: false
  },
  build: {
    transpile: [
      'trpc-nuxt', 
      '@trpc/client', 
      '@trpc/server',
      '@supabase/supabase-js',
      'entities',
      'estree-walker'
    ],
  },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@polar-sh/nuxt',
    '@nuxt/icon',
    '@posthog/nuxt',
    '@vueuse/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  alias: {
    '~~/server': fileURLToPath(new URL('./server', import.meta.url))
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    types: fileURLToPath(new URL('./database.types.ts', import.meta.url)),
    useSsrCookies: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/confirm'],
      saveRedirectToCookie: true
    },
    clientOptions: {
      auth: {
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
  posthogConfig: {
    publicKey: process.env.POSTHOG_API_KEY || '',
    clientConfig: {
      capture_exceptions: true, // Enables automatic exception capture on the client side (Vue)
    },
    serverConfig: {
      enableExceptionAutocapture: true, // Enables automatic exception capture on the server side (Nitro)
    },
  },
  icon: {
    provider: 'iconify',
    serverBundle: false,
    clientBundle: {
      // scan: true,
      includeCustomCollections: true, 
    },
    customCollections: [
      {
        prefix: 'custom',
        dir: 'app/assets/icons'
      },
    ],
  },
  nitro: {
    preset: process.env.NODE_ENV === 'development' ? 'bun' : 'aws-lambda',
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
    inlineDynamicImports: process.env.NODE_ENV === 'development' ? true : false,
    experimental: {
      wasm: false,
      websocket: false,
      legacyExternals: process.env.NODE_ENV === 'development' ? false : true,
    },
    rollupConfig: {
      external: [
        'vue'
      ]
    },
    moduleSideEffects: [
      'vue', 
      'entities', 
      'estree-walker'
    ],
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
        '@aws-sdk/client-acm',
        '@aws-sdk/client-cloudwatch-logs',
        '@aws-sdk/client-route-53',
        '@aws-sdk/client-sqs',
        '@aws-sdk/client-ssm',
        '@aws-sdk/client-sts',
        '@aws-sdk/client-secrets-manager',
        '@aws-sdk/client-codepipeline',
        '@aws-sdk/core',
        'perfect-debounce'
      ]
    }
  }
});