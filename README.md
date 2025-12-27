# Thunder

The open source platform-as-a-service for AWS. An alternative to AWS Amplify, Heroku, Render, and Vercel that's serverless and costs $0 to run on your infrastructure.

## Architecture

This is a **Turborepo monorepo** with the following structure:

### Workspaces

- **`apps/console`** — Nuxt full-stack UI application
- **`services`** — AWS CDK infrastructure (Provider, Runner, Ping services)
- **`supabase/functions`** — Serverless functions using Deno
- **`packages/types`** — Shared TypeScript types for CDK stacks:
  - [CDK-SPA](https://github.com/thunder-so/cdk-spa) — S3 + CloudFront hosting
  - [CDK-Functions](https://github.com/thunder-so/cdk-functions) — Lambda + API Gateway
  - [CDK-WebService](https://github.com/thunder-so/cdk-webservice) — ECS Fargate + API Gateway

## Services Overview

- **Provider** — Lambda endpoint for connecting AWS accounts to Thunder
- **Runner** — AWS CodeBuild configuration system for CDK stack deployments
- **Ping** — Event listener for AWS account pipeline execution events

## Getting Started

### Prerequisites

- Supabase account and database
- AWS account
- GitHub account with a GitHub App configured

### Quick Links

- **📖 [Release Guide](./docs/RELEASE_GUIDE.md)** — How to create releases, deploy to production/sandbox, and manage changesets
- **⚙️ [Configuration Guide](./docs/CONFIGURATION.md)** — Setup GitHub secrets, AWS credentials, and Supabase tokens

## Development Commands

```bash
# Install dependencies
bun install

# Development
bun run dev          # Start all workspaces in dev mode
bun run build        # Build all workspaces
bun run test         # Run tests
bun run lint         # Lint all workspaces

# Release management
bun changeset add    # Create a changeset for a new release
bun changeset status # View pending changesets
```

## Deployment

### Sandbox (Manual)

Deploy individual components to sandbox environment:

```bash
# Console
cd apps/console && bun run deploy:sandbox

# Services
cd services && bun run deploy:sandbox:provider
cd services && bun run deploy:sandbox:runner
cd services && bun run deploy:sandbox:ping

# Supabase functions
npx supabase functions deploy notification-webhook --project-ref $SANDBOX_SUPABASE_PROJECT_ID
npx supabase functions deploy github-webhook
npx supabase functions deploy polar-webhook --no-verify-jwt
```

### Production (Automated)

Production releases are **automatic** when changesets are pushed to `master`:

1. Create a changeset: `bun changeset add`
2. Commit and push: `git commit -m "feat: description" && git push origin master`
3. GitHub Actions automatically: versions packages → deploys services → deploys functions → deploys console

For full details, see the **[Release Guide](./docs/RELEASE_GUIDE.md)**.

## Cross-Account Deployments

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

