# Configuration Guide

This document covers all configuration required to set up the release management system for the Thunder platform monorepo.

## GitHub Environments and Secrets

This project uses [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) to separate configurations for `production` and `sandbox`. You must create these two environments in your repository settings.

All secrets are stored at the environment level. Go to **Settings → Environments**, create `production` and `sandbox`, and add the following secrets to **each** environment.

### Environment Secrets

These secrets must be configured in both the `production` and `sandbox` environments in your GitHub repository settings.

| Secret Name | Example Value | Description |
|---|---|---|
| `AWS_ACCOUNT` | `123456789012` | AWS Account ID where the infrastructure is deployed. |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS access key ID for the deployment user. |
| `AWS_SECRET_ACCESS_KEY` | `...` | AWS secret access key for the deployment user. |
| `AWS_REGION` | `us-east-1` | Default AWS region for console deployments. |
| `DATABASE_URL` | `postgres://...` | Connection string for your Supabase Postgres database. |
| `GH_APP` | `thunder-app` | The name of your GitHub App. |
| `GH_APP_ID` | `123456` | The ID of your GitHub App. |
| `GH_CLIENT_ID` | `Iv1...` | The client ID of your GitHub App. |
| `GH_CLIENT_SECRET` | `...` | The client secret for your GitHub App. |
| `GH_PRIVATE_KEY` | `LS0...LQo=` | The base64-encoded private key for your GitHub App. |
| `GH_WEBHOOK_SECRET` | `...` | Secret used to secure the GitHub webhook Supabase function. |
| `POLAR_ACCESS_TOKEN` | `polar_oat_...` | Access token for Polar integration. |
| `POLAR_CHECKOUT_SUCCESS_URL`| `/payment?id={CHECKOUT_ID}` | The success URL for Polar checkouts. |
| `POLAR_SERVER` | `sandbox` or `production` | The Polar environment to use. |
| `POSTHOG_API_KEY` | `phc_...` | API key for PostHog analytics. |
| `POSTHOG_HOST` | `https://us.posthog.com` | The URL for the PostHog API host. |
| `PROVIDER_STACK` | `https://.../stack.yml` | URL to the CloudFormation template for the Provider service. |
| `RESEND_API_KEY` | `re_...` | API key for Resend to send transactional emails. |
| `RUNNER_ASSUME_ROLE_ARN` | `arn:aws:iam::...` | ARN of the IAM role for the Runner service to assume. |
| `RUNNER_REGION` | `us-east-1` | AWS region where the Runner service is deployed. |
| `RUNNER_SERVICE` | `https://sqs...` | The SQS queue URL for the Runner service. |
| `SITE_URL` | `https://thunder.so` | The public base URL for the console application. |
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | Supabase access token with project permissions. |
| `SUPABASE_KEY` | `ey...` | Your Supabase project's public `anon` key. |
| `SUPABASE_PROJECT_ID` | `your-project-ref` | The reference ID of your Supabase project. |
| `SUPABASE_SECRET_KEY` | `ey...` | Your Supabase project's `service_role` secret key. |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Your Supabase project URL. |


### Adding Secrets via GitHub CLI

You can use the GitHub CLI to set these secrets for each environment.

```bash
# Set secrets for the 'production' environment
gh secret set -e production AWS_ACCOUNT --body "..."
gh secret set -e production AWS_ACCESS_KEY_ID --body "AKIA..."
# ... repeat for all secrets

# Set secrets for the 'sandbox' environment
gh secret set -e sandbox AWS_ACCOUNT --body "..."
gh secret set -e sandbox AWS_ACCESS_KEY_ID --body "AKIA..."
# ... repeat for all secrets
```

---

## Local Development Configuration

For local development, create `.env` files for the console and services applications.

### Console Application (`apps/console/.env`)

Create this file using `apps/console/.env.example` as a template.

| Variable | Example | Description |
|---|---|---|
| `NODE_ENV` | `development` | Sets the application environment. |
| `SITE_URL` | `http://localhost:3000` | The base URL for the console application. |
| `AWS_ACCOUNT`| `123456789012` | Your AWS account ID. |
| `AWS_REGION` | `ap-southeast-1` | Your AWS region. |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Your Supabase project URL. |
| `SUPABASE_KEY` | `ey...` | Your Supabase project's public `anon` key. |
| `SUPABASE_SECRET_KEY` | `ey...` | Your Supabase project's `service_role` secret key. |
| `DATABASE_URL` | `postgres://...` | The connection string for your Supabase Postgres database. |
| `PROVIDER_STACK` | `https://.../stack-sandbox.yml` | URL to the CloudFormation template for the Provider service. |
| `RUNNER_REGION` | `us-east-1` | AWS region where the Runner service is deployed. |
| `RUNNER_ASSUME_ROLE_ARN` | `arn:aws:iam::...` | ARN of the IAM role for the Runner service to assume. |
| `RUNNER_SERVICE` | `https://sqs...` | The SQS queue URL for the Runner service. |
| `GH_APP` | `thunder-sandbox` | The name of your GitHub App. |
| `GH_APP_ID` | `123456` | The ID of your GitHub App. |
| `GH_PRIVATE_KEY`| `""` | The base64-encoded private key for your GitHub App. |
| `GH_CLIENT_ID` | `Iv1...` | The client ID of your GitHub App. |
| `GH_CLIENT_SECRET` | `...` | The client secret for your GitHub App. |
| `POLAR_SERVER` | `sandbox` | Polar environment to use (`sandbox` or `production`). |
| `POLAR_ACCESS_TOKEN` | `polar_oat_...` | Access token for Polar integration. |
| `POLAR_CHECKOUT_SUCCESS_URL` | `/payment?id={CHECKOUT_ID}` | Success URL for Polar checkouts. |
| `POSTHOG_HOST` | `https://us.posthog.com` | The URL for the PostHog API host. |
| `POSTHOG_API_KEY` | `phc_...` | API key for PostHog analytics. |

### Services (`services/.env`)

Create a `.env` file in the `services` directory.

| Variable | Example | Description |
|---|---|---|
| `AWS_PROFILE` | `sandbox` | The AWS profile to use from your `~/.aws/credentials` file for CDK deployments. |
| `AWS_REGION` | `us-east-1` | The default AWS region for CDK deployments. |

---

## Obtaining Credentials

The methods for obtaining AWS and Supabase credentials remain the same. Please refer to a previous version of this document if needed. It is recommended to use separate accounts/projects for `production` and `sandbox`.
