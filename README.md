# Thunder Platform

The open source platform-as-a-service (PaaS) built on AWS. 

Thunder Platform is an alternative to AWS Amplify, Heroku, Render, and Vercel that's serverless and costs $0 to run on your infrastructure.

This is paired with the [Thunder library](https://github.com/thunder-so/thunder/) which is a set of comprehensive CDK stacks to deploy any web application on AWS using the CLI.

## Architecture

This is a **Turborepo monorepo** with the following structure:

### Workspaces

- **`apps/console`** — Nuxt 4 full-stack UI application
- **`services`** — AWS CDK infrastructure backend
  - Provider — Installs AWS accounts 
  - Ping — Receives events from AWS CodePipeline
  - Runner — Deploys CDK stacks on connected AWS accounts
- **`supabase/functions`** — Supabase Serverless functions (using Deno)
  - github-webhook — Handles Github account/org installations
  - notification-webhook — Handles transactional emails using [Resend API](https://resend.com)
  - polar-webhook — Sync customers, products, subscriptions and orders using [Polar.sh](https://polar.sh)


## Getting Started

### Prerequisites

- An AWS account
- A Supabase account and database
- A GitHub account and a GitHub App
- Polar.sh account for payments
- Resend account for transactional emails

### Quick Links

- **⚙️ [Configuration Guide](./docs/CONFIGURATION.md)** — Setup GitHub secrets, AWS credentials, and Supabase tokens
- **⚙️ [Post Deployment Guide](./docs/POSTDEPLOY.md)** — Settings up IAM permissions for the platform 

## Deployment

### Sandbox (Manual)

Deploy individual components to sandbox environment:

```bash
# Console
cd apps/console && bun run deploy:sandbox

# Services
cd services && bun run deploy:sandbox:provider
cd services && bun run deploy:sandbox:ping
cd services && bun run deploy:sandbox:runner

# Supabase functions
npx supabase functions deploy notification-webhook --project-ref $SANDBOX_SUPABASE_PROJECT_ID
npx supabase functions deploy github-webhook --no-verify-jwt
npx supabase functions deploy polar-webhook --no-verify-jwt
```

### Cross-Account Deployments

To deploy Runner in a separate AWS account:

```bash
cdk deploy -c environment=sandbox -c consoleAccountId=111122223333
```

Then set environment variables in your Console deployment:

```env
RUNNER_ASSUME_ROLE_ARN=arn:aws:iam::222233334444:role/RunnerCrossAccountRole-sandbox
RUNNER_REGION=us-east-1
RUNNER_SERVICE=https://sqs.us-east-1.amazonaws.com/222233334444/RunnerQueue-sandbox.fifo
```

