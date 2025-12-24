import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Cdk, NuxtStack, type NuxtProps } from "@thunderso/cdk-nuxt";

const nuxtApp: NuxtProps = {
  env: {
    account: process.env.AWS_ACCOUNT!,
    region: process.env.AWS_REGION!,
  },
  application: 'thunder',
  service: 'console',
  environment: 'prod',

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
      { "SITE_URL": process.env.SITE_URL || 'https://console.thunder.so' },

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
      { "POLAR_SERVER": process.env.POLAR_SERVER! },
      { "POLAR_ACCESS_TOKEN": process.env.POLAR_ACCESS_TOKEN || '' },
      { "POLAR_CHECKOUT_SUCCESS_URL": process.env.POLAR_CHECKOUT_SUCCESS_URL || '' },

      // posthog
      { "POSTHOG_HOST": process.env.POSTHOG_HOST || '' },
      { "POSTHOG_API_KEY": process.env.POSTHOG_API_KEY || '' },
    ],
  },

  allowCookies: ['sb-*', 'selected-org-id', 'cookie_consent', 'cookie_consent_*', 'ph_*'],
  allowQueryParams: ['batch', 'input'],
  allowHeaders: ['authorization', 'content-type'],

  domain: 'console.thunder.so',
  hostedZoneId: 'Z04172542KY36VFH88DJJ',
  globalCertificateArn: 'arn:aws:acm:us-east-1:665186350589:certificate/d7c10cb1-d3fb-4547-b6ba-1717f20a25cf', // must be in us-east-1
  regionalCertificateArn: 'arn:aws:acm:us-east-1:665186350589:certificate/d7c10cb1-d3fb-4547-b6ba-1717f20a25cf', // must match your stack's region
};

new NuxtStack(
    new Cdk.App(),
    `${nuxtApp.application}-${nuxtApp.service}-${nuxtApp.environment}-stack`,
    nuxtApp
);