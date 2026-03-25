# Release Guide

Trunk-based release management with manual deployments for both Sandbox and Production.

## Quick Start

### Create a Release

**Via GitHub Actions UI:**
1. Go to **Actions** → **Release to Production**
2. Select workspace/service from dropdown
3. Click **Run workflow**

**Typical deployment order:**
1. Services: Provider → Ping → Runner
2. Functions: notification-webhook → github-webhook → polar-webhook
3. Console

## Setup

### Prerequisites

Ensure GitHub Environments (`production` and `sandbox`) and their corresponding secrets are configured. Refer to the **[Configuration Guide](./CONFIGURATION.md)** for detailed setup instructions.

Secrets are stored directly within their respective GitHub Environments.

## Trunk-Based Development

All changes go directly to `master` — no pull requests.

```bash
# Feature branch (optional, for code review)
git checkout -b feature/my-feature
# ... make changes, test ...
git checkout master
git merge feature/my-feature
git push origin master
```

## Production Release Flow

Production releases are manual via `workflow_dispatch` using the `production` GitHub Environment.

### Deployment Options

| Option | Deploys |
|--------|---------|
| `all` | Everything (Sequential) |
| `console` | Console only |
| `services-all` | All services (Provider, Runner, Ping) |
| `services-provider` | Provider service only |
| `services-runner` | Runner service only |
| `services-ping` | Ping service only |
| `supabase-all` | All Supabase functions |
| `supabase-notification` | notification-webhook only |
| `supabase-github` | github-webhook only |
| `supabase-polar` | polar-webhook only |

### Local Commands (Sandbox Only)

```bash
# Console
cd apps/console && bun run deploy:sandbox

# Services
cd services && bun run deploy:sandbox
cd services && bun run deploy:sandbox:provider
cd services && bun run deploy:sandbox:runner
cd services && bun run deploy:sandbox:ping

# Functions (assuming SUPABASE_PROJECT_ID is set in your local .env)
npx supabase functions deploy notification-webhook --project-ref $SUPABASE_PROJECT_ID
npx supabase functions deploy github-webhook --project-ref $SUPABASE_PROJECT_ID
npx supabase functions deploy polar-webhook --project-ref $SUPABASE_PROJECT_ID
npx supabase functions deploy resend-audience-webhook --no-verify-jwt
```

## Common Commands Cheat Sheet

```bash
# Debugging
git log --oneline | head -10
aws logs tail /aws/lambda/ConsoleFunction-prod --follow
supabase functions logs NAME --project-ref $SUPABASE_PROJECT_ID
```

## FAQ

**Q: Can I deploy to production automatically?**
No. Production releases are manual via GitHub Actions to ensure control.

**Q: Can I use pull requests?**
No. Trunk-based workflow (direct to master).

**Q: Where are release versions tracked?**
Currently tracked by the commit SHA in the workflow logs.

**Q: Can I test production deployments locally?**
Yes, but sandbox is recommended for testing: `cd apps/console && AWS_PROFILE=sandbox bun run deploy:sandbox`

## Workspaces

| Workspace | Location | Version | Deploy Scripts |
|-----------|----------|---------|----------------|
| @thunderso/platform | / | 0.1.0 | N/A (root) |
| console | apps/console | 0.1.0 | deploy:prod, deploy:sandbox |
| thunder-services | services/ | 0.1.0 | deploy:prod:*, deploy:sandbox:* |
| ping-service | services/ping | 0.1.0 | deploy:prod:ping, deploy:sandbox:ping |
| provider-service | services/provider | 0.1.0 | deploy:prod:provider, deploy:sandbox:provider |
| runner-service | services/runner | 0.1.0 | deploy:prod:runner, deploy:sandbox:runner |
| supabase-functions | supabase/ | 0.1.0 | CLI: supabase functions deploy |

## Related

- [Configuration Guide](./CONFIGURATION.md) — GitHub secrets, AWS credentials, Supabase setup
- [AWS CDK Docs](https://docs.aws.amazon.com/cdk/)
- [Supabase Functions](https://supabase.com/docs/guides/functions)