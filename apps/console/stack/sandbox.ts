// import { Cdk, Nuxt, type NuxtProps } from "@thunder-so/thunder";
import { Cdk, Nuxt, type NuxtProps } from "../../../../thunder/";

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
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.X86_64,
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

  allowCookies: ['sb-*', 'selected-org-id', 'cookie_consent', 'cookie_consent_*', 'ph_*'],
  allowQueryParams: ['batch', 'input'],
  allowHeaders: ['authorization', 'content-type'],
};

const stack = new Nuxt(
  new Cdk.App(),
  `${nuxtApp.application}-${nuxtApp.service}-${nuxtApp.environment}-stack`,
  nuxtApp
);

stack.lambdaRole.addToPrincipalPolicy(new Cdk.aws_iam.PolicyStatement({
  sid: 'AssumeRoleOnCustomerAccount',
  actions: ['sts:AssumeRole'],
  resources: ['arn:aws:iam::*:role/thunder-*'],
}));

stack.lambdaRole.addToPrincipalPolicy(new Cdk.aws_iam.PolicyStatement({
  sid: 'ReadLogsOnCustomerAccount',
  actions: ['logs:GetLogEvents', 'logs:DescribeLogStreams', 'logs:DescribeLogGroups'],
  resources: ['arn:aws:logs:*:*:log-group:*'],
}));

stack.lambdaRole.addToPrincipalPolicy(new Cdk.aws_iam.PolicyStatement({
  sid: 'SendSQSMessage',
  actions: ['sqs:SendMessage'],
  resources: ['arn:aws:sqs:us-east-1:047719662375:RunnerQueue-sandbox.fifo'],
}));