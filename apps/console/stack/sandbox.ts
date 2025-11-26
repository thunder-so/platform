import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Cdk, NuxtStack, type NuxtProps } from "@thunderso/cdk-nuxt";

const nuxtApp: NuxtProps = {
  env: {
    account: process.env.AWS_ACCOUNT!,
    region: process.env.AWS_REGION!,
  },
  application: 'thunder',
  service: 'console',
  environment: 'sandbox',

  rootDir: '',

  serverProps: {
    dockerFile: 'Dockerfile',
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    memorySize: 1792,
    timeout: 10,
    tracing: false,
    exclude: ['**/*.ts', '**/*.map'],
    keepWarm: true,

    variables: [
      { "SITE_URL": process.env.SITE_URL || 'http://localhost:3000' },

      // supabase
      { "SUPABASE_URL": process.env.SUPABASE_URL! },
      { "SUPABASE_KEY": process.env.SUPABASE_KEY! },
      { "SUPABASE_SECRET_KEY": process.env.SUPABASE_SECRET_KEY! },
      { "DATABASE_URL": process.env.DATABASE_URL! },

      // services
      { "PROVIDER_STACK": process.env.PROVIDER_STACK! },
      { "RUNNER_REGION": process.env.RUNNER_REGION || 'us-east-1' },
      { "RUNNER_ASSUME_ROLE_ARN": process.env.RUNNER_ASSUME_ROLE_ARN || '' },
      { "RUNNER_SERVICE": process.env.RUNNER_SERVICE! },

      // github
      { "GH_APP": process.env.GH_APP! },
      { "GH_CLIENT_ID": process.env.GH_CLIENT_ID! },
      { "GH_APP_ID": process.env.GH_APP_ID! },
      { "GH_PRIVATE_KEY": process.env.GH_PRIVATE_KEY! },
      { "GH_CLIENT_SECRET": process.env.GH_CLIENT_SECRET! },

      // polar
      { "POLAR_SERVER": process.env.POLAR_SERVER || 'sandbox' },
      { "POLAR_ACCESS_TOKEN": process.env.POLAR_ACCESS_TOKEN || '' },
      { "POLAR_CHECKOUT_SUCCESS_URL": process.env.POLAR_CHECKOUT_SUCCESS_URL || '' },

      // posthog
      { "POSTHOG_HOST": process.env.POSTHOG_HOST || '' },
      { "POSTHOG_API_KEY": process.env.POSTHOG_API_KEY || '' },
    ],
  },

  allowCookies: ['sb-*', 'selected-org-id'],
  allowQueryParams: ['batch', 'input'],
  allowHeaders: ['authorization', 'content-type'],
};

new NuxtStack(
    new Cdk.App(),
    `${nuxtApp.application}-${nuxtApp.service}-${nuxtApp.environment}-stack`,
    nuxtApp
);