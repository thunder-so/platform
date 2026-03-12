# Release Guide

Trunk-based release management with hybrid versioning, automated production deployments, and manual sandbox testing.

## Quick Start

### Create a Production Release

```bash
# Make changes
git add . && git commit -m "feat: add new feature"

# Create changeset (interactive)
bun changeset add

# Commit and push (triggers automatic production release)
git add .changeset/ && git commit -m "feat: add new feature (with changeset)"
git push origin master
```

**Deployment order** (automatic, using `production` GitHub Environment):
1. Services: Provider → Runner → Ping (sequential)
2. Functions: notification-webhook → github-webhook → polar-webhook (sequential)
3. Console (final)

### Test in Sandbox

**Via GitHub Actions UI:**
1. Go to **Actions** → **Deploy to Sandbox**
2. Select workspace/service from dropdown
3. Click **Run workflow**

**Local deployment:**
```bash
cd apps/console && bun run deploy:sandbox
cd services && bun run deploy:sandbox:provider
# Assuming SUPABASE_PROJECT_ID is set in your local .env
supabase functions deploy notification-webhook --project-ref $SUPABASE_PROJECT_ID
```

## Setup

### Prerequisites

Ensure GitHub Environments (`production` and `sandbox`) and their corresponding secrets are configured. Refer to the **[Configuration Guide](./CONFIGURATION.md)** for detailed setup instructions.
Secrets are no longer prefixed with `PROD_` or `SANDBOX_` but are stored directly within their respective GitHub Environments.

### Local Environment

```bash
bun install

# apps/console/.env
AWS_PROFILE=sandbox
AWS_REGION=us-east-1

# services/.env
AWS_PROFILE=sandbox
AWS_REGION=us-east-1
```

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

## Creating Changesets

Changesets document what changed and how to version packages.

```bash
bun changeset add
```

**Interactive prompts:**
1. Select which packages changed (multi-select with space bar)
2. Select semver bump type per package:
   - `major` — Breaking changes (1.0.0 → 2.0.0)
   - `minor` — New features (1.0.0 → 1.1.0)
   - `patch` — Bug fixes (1.0.0 → 1.0.1)
3. Write summary (becomes CHANGELOG entry)

**Example changeset** (`.changeset/mysterious-panda.md`):
```markdown
---
"provider-service": minor
"runner-service": patch
"console": minor
---

Add support for new AWS regions and improve error logging.
```

**Commit and push:**
```bash
git add .changeset/
git commit -m "feat: new AWS regions (with changeset)"
git push origin master
```

Production workflow starts automatically.

## Production Release Flow

When changesets are pushed to `master`, the `production` GitHub Environment is used:

1. **Changeset Detection** — Workflow identifies changeset files
2. **Version Bump** — `changeset version` bumps versions, generates CHANGELOG.md
3. **Services Deployment** — Provider → Runner → Ping (stops on failure)
4. **Functions Deployment** — notification → github → polar (stops on failure)
5. **Console Deployment** — Final step
6. **Git Tags** — Release tags created
7. **Rollback** — Automatic if any step fails

## Monitoring Releases

1. Go to **GitHub Actions** → **Release to Production**
2. View real-time logs
3. 🟢 = Success, 🔴 = Failure

## Troubleshooting Production

### Services Deployment Failed

```bash
cd services
# Assuming AWS_PROFILE='production' in your ~/.aws/credentials
AWS_PROFILE=production npm run deploy:prod:provider
# Check logs, fix issue, create new changeset
```

### Functions Deployment Failed

```bash
# Assuming SUPABASE_PROJECT_ID is set in your local .env
supabase functions list --project-ref $SUPABASE_PROJECT_ID
supabase functions deploy notification-webhook --project-ref $SUPABASE_PROJECT_ID
```

### Console Deployment Failed

```bash
cd apps/console
# Assuming AWS_PROFILE='production' in your ~/.aws/credentials
AWS_PROFILE=production npm run deploy:prod
```

### Rollback

**Automatic:** Workflow reverts version commit on failure

**Manual:** 
```bash
git reset --hard HEAD~1
git push --force-with-lease
```

Then fix issue and create new changeset.

## Sandbox Deployments

Manual, granular deployments without versioning. Uses the `sandbox` GitHub Environment.

### GitHub Actions Options

| Option | Deploys |
|--------|---------|
| `all` | Everything |
| `console` | Console only |
| `services-all` | All services |
| `services-provider` | Provider only |
| `services-runner` | Runner only |
| `services-ping` | Ping only |
| `supabase-all` | All functions |
| `supabase-notification` | notification-webhook only |
| `supabase-github` | github-webhook only |
| `supabase-polar` | polar-webhook only |

### Local Commands

```bash
# Console
cd apps/console && bun run deploy:sandbox

# Services
cd services && bun run deploy:sandbox
cd services && bun run deploy:sandbox:provider
cd services && bun run deploy:sandbox:runner
cd services && bun run deploy:sandbox:ping

# Functions (assuming SUPABASE_PROJECT_ID is set in your local .env)
supabase functions deploy notification-webhook --project-ref $SUPABASE_PROJECT_ID
supabase functions deploy github-webhook --project-ref $SUPABASE_PROJECT_ID
supabase functions deploy polar-webhook --project-ref $SUPABASE_PROJECT_ID
```

### Sandbox Rollback

No version changes (no changesets). Fix issue and re-deploy:
```bash
cd services && bun run deploy:sandbox:provider
```

## Changeset Management

```bash
# View pending changesets
bun changeset status --verbose

# Delete changeset (before applying)
rm .changeset/mysterious-panda.md

# View release history
cat CHANGELOG.md
git tag | grep -E "@|console"
```

## Common Commands Cheat Sheet

```bash
# Development
bun install
bun run dev
bun run build
bun run test
bun run lint

# Release (production only)
bun changeset add              # Create changeset
bun changeset status --verbose # View pending changesets
git push origin master         # Trigger production workflow

# Deployments (sandbox) (assuming SUPABASE_PROJECT_ID is set in your local .env)
cd apps/console && bun run deploy:sandbox
cd services && bun run deploy:sandbox:provider
supabase functions deploy NAME --project-ref $SUPABASE_PROJECT_ID

# Debugging
git log --oneline | head -10
git tag | head -20
aws logs tail /aws/lambda/ConsoleFunction-prod --follow
supabase functions logs NAME --project-ref $SUPABASE_PROJECT_ID
```

## FAQ

**Q: Can I deploy to production without changesets?**
No. Changesets required for version tracking and changelog.

**Q: How do I deploy only one service to production?**
Create changeset mentioning only that service. Workflow will skip others.

**Q: Can I use pull requests?**
No. Trunk-based workflow (direct to master).

**Q: What if multiple changesets exist?**
All applied in single `changeset version` call. Versions calculated by max semver bump per package.

**Q: Where are release versions tracked?**
Git tags and CHANGELOG.md files. View with: `git tag | grep -E "console@|provider-service@"`

**Q: Can I test production deployments locally?**
Yes, sandbox only: `cd apps/console && AWS_PROFILE=sandbox bun run deploy:sandbox`

## Workspaces

| Workspace | Location | Version | Deploy Scripts |
|-----------|----------|---------|----------------|
| @thunderso/platform | / | 0.1.0 | N/A (root) |
| console | apps/console | 0.1.0 | deploy:prod, deploy:sandbox |
| @thunder/types | packages/types | 0.1.0 | N/A (types only) |
| thunder-services | services/ | 0.1.0 | deploy:prod:*, deploy:sandbox:* |
| ping-service | services/ping | 0.1.0 | deploy:prod:ping, deploy:sandbox:ping |
| provider-service | services/provider | 0.1.0 | deploy:prod:provider, deploy:sandbox:provider |
| runner-service | services/runner | 0.1.0 | deploy:prod:runner, deploy:sandbox:runner |
| supabase-functions | supabase/ | 0.1.0 | CLI: supabase functions deploy |

## Related

- [Configuration Guide](./CONFIGURATION.md) — GitHub secrets, AWS credentials, Supabase setup
- [Changesets Docs](https://github.com/changesets/changesets)
- [AWS CDK Docs](https://docs.aws.amazon.com/cdk/)
- [Supabase Functions](https://supabase.com/docs/guides/functions)