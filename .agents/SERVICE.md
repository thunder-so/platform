# Services Table Architecture Refactor Plan

## Overview

Refactor the `services` table to split the flat metadata blob into three distinct JSONB columns:
- `pipeline_metadata` — source + build props (pipeline-related, nullable)
- `cloudfront_metadata` — CloudFront/edge config (STATIC only, nullable)
- `metadata` — stack-specific runtime config (debug + functionProps / serviceProps / outputDir)

Additionally, remove the top-level `owner`, `repo`, and `branch` columns from the `services` table, nesting them inside `pipeline_metadata.sourceProps`.

---

## New Column Shapes

### `pipeline_metadata` (nullable — blank when no pipeline)
```json
{
  "sourceProps": {
    "owner": "string",
    "repo": "string",
    "branchOrRef": "string"
  },
  "buildProps": {
    "runtime": "string",
    "runtime_version": "string",
    "installcmd": "string",
    "buildcmd": "string",
    "startcmd": "string",
    "buildSystem": "Nixpacks | Dockerfile",
    "include": [],
    "exclude": []
  }
}
```

### `cloudfront_metadata` (nullable — STATIC only)
```json
{
  "headers": [],
  "rewrites": [],
  "redirects": [],
  "allowCookies": [],
  "allowHeaders": [],
  "errorPagePath": "",
  "denyQueryParams": [],
  "allowQueryParams": []
}
```

### `metadata`

**STATIC:**
```json
{ "debug": false, "outputDir": "dist/" }
```

**LAMBDA:**
```json
{
  "debug": false,
  "functionProps": { "codeDir": "dist", "handler": "index.handler", "runtime": "nodejs22.x", "timeout": 30, "keepWarm": false, "dockerFile": "Dockerfile", "memorySize": 1792, "architecture": "x86" }
}
```

**FARGATE:**
```json
{
  "debug": false,
  "serviceProps": { "cpu": 256, "port": 3000, "dockerFile": "Dockerfile", "memorySize": 512, "architecture": "x86", "desiredCount": 1 }
}
```

---

## File-by-File Change List

---

### 1. `platform/apps/console/server/db/schema.ts`

**What changes:**
- Remove columns `owner`, `repo`, `branch` from the `services` table definition.
- Add column `pipeline_metadata: jsonb('pipeline_metadata')` (nullable).
- Add column `cloudfront_metadata: jsonb('cloudfront_metadata')` (nullable).
- The existing `metadata` column stays but its shape narrows (no more `buildProps`, no more CloudFront fields).
- Export updated `Service` and `NewService` inferred types.

**Drizzle migration required:** Yes — `ALTER TABLE services DROP COLUMN owner, DROP COLUMN repo, DROP COLUMN branch; ALTER TABLE services ADD COLUMN pipeline_metadata jsonb; ADD COLUMN cloudfront_metadata jsonb;`

---

### 2. `platform/apps/console/server/validators/common.ts`

**What changes:**

- **Remove** `buildProps` from `StaticServiceMetadataSchema`, `LambdaServiceMetadataSchema`, `FargateServiceMetadataSchema`.
- **Remove** CloudFront fields (`headers`, `rewrites`, `redirects`, `allowCookies`, `allowHeaders`, `errorPagePath`, `denyQueryParams`, `allowQueryParams`) from `StaticServiceMetadataSchema`.
- **Add** new exported schemas:
  - `SourcePropsSchema` — `{ owner, repo, branchOrRef }` (all strings)
  - `StaticPipelineMetadataSchema` — `{ sourceProps: SourcePropsSchema.optional(), buildProps: StaticBuildPropsSchema.optional() }`
  - `LambdaPipelineMetadataSchema` — `{ sourceProps: SourcePropsSchema.optional(), buildProps: LambdaBuildPropsSchema.optional() }`
  - `FargatePipelineMetadataSchema` — `{ sourceProps: SourcePropsSchema.optional(), buildProps: FargateBuildPropsSchema.optional() }`
  - `CloudFrontMetadataSchema` — contains the extracted CloudFront fields (redirects, rewrites, headers, allowCookies, allowHeaders, errorPagePath, denyQueryParams, allowQueryParams)
- **Update** `StaticServiceMetadataSchema` → `{ debug, outputDir }` only.
- **Update** `LambdaServiceMetadataSchema` → `{ debug, functionProps }` only.
- **Update** `FargateServiceMetadataSchema` → `{ debug, serviceProps }` only.
- Export updated inferred types: `StaticServiceMetadata`, `LambdaServiceMetadata`, `FargateServiceMetadata`, `CloudFrontMetadata`, `PipelineMetadata`.

---

### 3. `platform/apps/console/server/validators/app.ts`

**What changes:**
- Remove `owner`, `repo`, `branch` from `baseServiceSchema` (they no longer exist as top-level columns).
- Add `pipeline_metadata` field to `baseServiceSchema` using the appropriate per-stack `PipelineMetadataSchema` (or a union/optional).
- Add `cloudfront_metadata` field to the STATIC variant of `serviceSchema` using `CloudFrontMetadataSchema.optional()`.
- Update `ServiceSchema` exported type.

---

### 4. `platform/apps/console/server/validators/new.ts`

**What changes:**
- Remove `owner`, `repo`, `branch` from `serviceInputBaseSchema`.
- Add `pipeline_metadata` to `serviceInputBaseSchema` (optional, since it may not be set at creation time for non-pipeline stacks).
- Add `cloudfront_metadata` to the STATIC variant of `serviceInputSchema` using `CloudFrontMetadataSchema.optional()`.
- Update `ServiceInputSchema` exported type.

---

### 5. `platform/apps/console/app/composables/useNewApplicationFlow.ts`

**What changes:**
- **`STACK_DEFAULTS`**: Move `buildProps` out of each stack's `metadata` and into a new `pipeline_metadata.buildProps` field. Move CloudFront fields out of STATIC `metadata` and into `cloudfront_metadata`. Update `StaticServiceMetadata`, `LambdaServiceMetadata`, `FargateServiceMetadata` types accordingly.
- **`createServiceSchema`**: 
  - Remove `owner`, `repo`, `branch` from `baseService` object.
  - Add `pipeline_metadata: { sourceProps: { owner, repo, branchOrRef: selectedBranchName }, buildProps: ... }` to each service schema.
  - `applyBuildSettings` should now write into `pipeline_metadata.buildProps` instead of `metadata.buildProps`.
  - For STATIC: move CloudFront defaults into `cloudfront_metadata`.
- **`watch(selectedBranchName)`**: Update to write `service.pipeline_metadata.sourceProps.branchOrRef` instead of `service.branch`.
- **`setApplicationSchema`**: No structural change needed beyond the service schema shape.

---

### 6. `platform/apps/console/app/composables/useApplications.ts`

**What changes:**
- **Supabase select query**: Remove `owner`, `repo`, `branch` from the `services(...)` select list. Add `pipeline_metadata`, `cloudfront_metadata` to the select list.
- **`currentService` computed**: No logic change, but downstream consumers that accessed `service.owner`, `service.repo`, `service.branch` must now use `service.pipeline_metadata?.sourceProps?.owner` etc.

---

### 7. `platform/apps/console/app/composables/useSaveAndRebuild.ts`

**No structural changes required.** This composable delegates to tRPC mutations and does not directly reference `owner`, `repo`, `branch`, or `buildProps`. It will work correctly once the underlying service schema is updated.

---

### 8. `platform/apps/console/server/lib/platform.library.ts`

**What changes:**
- **`createBuildContext`**: 
  - `sourceProps` is now read from `service.pipeline_metadata.sourceProps` instead of `{ owner: service.owner, repo: service.repo, branchOrRef: service.branch }`.
  - `buildProps` is now read from `service.pipeline_metadata.buildProps` instead of `service.metadata.buildProps`.
  - The spread `...service.metadata` in the context must be updated — it should no longer include `buildProps` (now in `pipeline_metadata`) or CloudFront fields (now in `cloudfront_metadata`). Instead, explicitly spread `service.metadata` (stack-specific) and `service.pipeline_metadata` (build/source) separately into the context.
  - For STATIC: also spread `service.cloudfront_metadata` into the context so CloudFront props reach the CDK stack.
  - Update the `BuildContext` interface: `sourceProps` and `buildProps` move to top-level of `metadata` (as they are today in the CDK context shape), sourced from `pipeline_metadata`.

---

### 9. `platform/services/runner/build.ts`

**What changes:**
- The `RunnerRequest` / `RunnerRequestBase` types reference `context.metadata.sourceProps` and `context.metadata.buildProps` — these paths remain the same in the CDK context object (the library still expects them at `metadata.sourceProps` and `metadata.buildProps`). No change needed here **as long as** `platform.library.ts` correctly assembles the context from the new column structure.
- `generateBuildSpec`: reads `context.metadata.buildProps` and `context.metadata.sourceProps` — no change needed since the context shape passed to CodeBuild is unchanged.

---

### 10. `platform/apps/console/app/pages/app/[app_id]/settings.vue`

**What changes:**
- **Github settings section**: 
  - `service.owner`, `service.repo` → `service.pipeline_metadata?.sourceProps?.owner`, `service.pipeline_metadata?.sourceProps?.repo`
  - `service.branch` → `service.pipeline_metadata?.sourceProps?.branchOrRef`
  - `selectedBranch` initial value: read from `service.pipeline_metadata?.sourceProps?.branchOrRef`
  - `saveBranchOnly` / `saveBranchAndRebuild`: the tRPC mutation `updateService` must be updated to write `pipeline_metadata.sourceProps.branchOrRef` and `rootDir` (see tRPC router changes below).
  - `RootDirInput` props: `branch` prop → `service.pipeline_metadata?.sourceProps?.branchOrRef`
- **`saveServiceMetadata`**: passes `metadata` only (no `buildProps`). The `AppServiceConfiguration` component now receives only the stack-specific metadata. Build props are saved separately via a new mutation or included in `pipeline_metadata` update.
- **`watch(service)`**: update `selectedBranch.value` and `selectedRootDir.value` to read from new paths.
- **`fetchBranches`**: reads `service.pipeline_metadata?.sourceProps?.owner`, `service.pipeline_metadata?.sourceProps?.repo`, `service.installation_id`.

---

### 11. `platform/apps/console/app/pages/app/[app_id]/index.vue`

**What changes:**
- GitHub link in the deploys list: `service?.owner`, `service?.repo`, `service?.branch` → `service?.pipeline_metadata?.sourceProps?.owner`, `service?.pipeline_metadata?.sourceProps?.repo`, `service?.pipeline_metadata?.sourceProps?.branchOrRef`.

---

### 12. `platform/apps/console/app/pages/app/[app_id]/headers.vue`

**What changes:**
- `state` is currently initialized from `newVal.metadata` (which includes `headers`). After refactor, `headers` lives in `cloudfront_metadata`.
- Initialize `state` from `newVal.cloudfront_metadata` (or a merged object if the form schema requires the full `CloudFrontMetadataSchema`).
- `saveHeaders` mutation: call `updateServiceCloudfrontMetadata` (new mutation) instead of `updateServiceMetadata`, passing `cloudfront_metadata`.
- Update `:schema` binding on `UForm` to use `CloudFrontMetadataSchema` instead of `StaticServiceMetadataSchema`.

---

### 13. `platform/apps/console/app/pages/app/[app_id]/redirects.vue`

**What changes:**
- Same pattern as `headers.vue`: `redirects` and `rewrites` move from `metadata` to `cloudfront_metadata`.
- Initialize `state` from `newVal.cloudfront_metadata`.
- `saveMetadata` → call `updateServiceCloudfrontMetadata` mutation.
- Update `:schema` to `CloudFrontMetadataSchema`.

---

### 14. `platform/apps/console/app/components/app/ServiceConfiguration.vue`

**No structural changes.** Passes `service.metadata` to child config components. Since `metadata` now only contains stack-specific props (no `buildProps`), the child components must be updated (see below).

---

### 15. `platform/apps/console/app/components/app/ServiceConfigStatic.vue`

**What changes:**
- Remove `buildProps.*` form fields (`runtime_version`, `installcmd`, `buildcmd`) — these now live in `pipeline_metadata` and are edited in the settings page's Github/pipeline section.
- The `:schema` binding and `configuration` type should use the new narrow `StaticServiceMetadataSchema` (`{ debug, outputDir }`).
- Only `outputDir` remains as an editable field in this component.

---

### 16. `platform/apps/console/app/components/app/ServiceConfigLambda.vue`

**What changes:**
- Remove `buildProps.*` form fields (`installcmd`, `buildcmd`, `runtime_version`) — move to pipeline settings section.
- Keep `functionProps.*` fields (dockerFile, runtime, codeDir, handler, memorySize, keepWarm).
- The `deploymentMode` logic and runtime sync (`watch(functionProps.runtime)`) that syncs to `buildProps.runtime_version` must be removed or relocated to the pipeline settings section.
- Update schema binding to new `LambdaServiceMetadataSchema` (`{ debug, functionProps }`).

---

### 17. `platform/apps/console/app/components/app/ServiceConfigFargate.vue`

**What changes:**
- Remove `buildProps.*` form fields (`buildSystem`, `installcmd`, `buildcmd`, `startcmd`) — move to pipeline settings section.
- Keep `serviceProps.*` fields (desiredCount, cpu, memorySize, port).
- Update schema binding to new `FargateServiceMetadataSchema` (`{ debug, serviceProps }`).

---

### 18. `platform/apps/console/app/components/new/ServiceConfiguration.vue`

**What changes:**
- `createServiceSchema` (called inside this component via the composable) now returns a service with `pipeline_metadata` and `cloudfront_metadata` instead of flat `metadata`. No direct template changes needed, but the emitted `update:service` payload shape changes.
- The `environmentVariablesModel` computed setter references `updatedService.stack_type` — no change needed there.

---

### 19. `platform/apps/console/app/components/new/ServiceConfigStatic.vue`

**What changes:**
- Remove `buildProps.*` fields from the form (same rationale as app variant).
- Only `outputDir` remains.
- Update schema to new `StaticServiceMetadataSchema`.

---

### 20. `platform/apps/console/app/components/new/ServiceConfigLambda.vue`

**What changes:**
- Remove `buildProps.*` fields.
- Keep `functionProps.*` fields.
- Remove the `buildProps.runtime_version` sync watch.
- Update schema to new `LambdaServiceMetadataSchema`.

---

### 21. `platform/apps/console/app/components/new/ServiceConfigFargate.vue`

**What changes:**
- Remove `buildProps.*` fields.
- Keep `serviceProps.*` fields.
- Update schema to new `FargateServiceMetadataSchema`.

---

### 22. `platform/apps/console/app/pages/new/configure.vue`

**What changes:**
- The `ServiceConfiguration` component emits an updated service with the new shape. The handler `@update:service` writes to `applicationSchema.environments[0].services[0]` — no change to the handler logic, but the shape of the written object changes.
- The `UFormField` for "Repository" currently shows `repoInfo.owner/repoInfo.repo` — no change needed (still sourced from `repoInfo` state, not from the service object).
- The `UFormField` for "Branch" uses `selectedBranchName` from the composable — no change needed.
- The `watch(selectedBranchName)` in `useNewApplicationFlow` must write to `service.pipeline_metadata.sourceProps.branchOrRef` (covered in item 5).

---

### 23. `platform/apps/console/app/pages/new/deploy.vue`

**What changes:**
- PostHog capture: `applicationSchema.value.environments?.[0]?.services?.[0]?.owner` → `applicationSchema.value.environments?.[0]?.services?.[0]?.pipeline_metadata?.sourceProps?.owner`
- Same for `repo` reference in the `handleAuthorize` posthog capture.
- No other structural changes.

---

### 24. tRPC Service Router (to be identified — likely `server/trpc/routers/services.ts` or similar)

**What changes (anticipated):**
- `updateService` mutation: currently updates `branch` and `rootDir` as top-level columns. Must be updated to write `pipeline_metadata` JSONB (merge `sourceProps.branchOrRef` and keep existing `buildProps`).
- `updateServiceMetadata` mutation: currently writes to `metadata`. Must continue to write to `metadata` (now narrower shape). Add a new `updateServicePipelineMetadata` mutation for updating `pipeline_metadata.buildProps`.
- Add `updateServiceCloudfrontMetadata` mutation for updating `cloudfront_metadata` (used by headers.vue and redirects.vue).
- `createService` / application creation: must write `pipeline_metadata` and `cloudfront_metadata` instead of flat `metadata` with embedded `buildProps` and CloudFront fields.

> **Note:** The tRPC router file was not scanned. It must be located and reviewed before implementation.

---

### 25. Database Migration

A Drizzle migration must be created that:
1. Adds `pipeline_metadata jsonb` column to `services`.
2. Adds `cloudfront_metadata jsonb` column to `services`.
3. Backfills existing rows:
   - `pipeline_metadata` ← `{ sourceProps: { owner, repo, branchOrRef: branch }, buildProps: metadata->buildProps }`
   - `cloudfront_metadata` ← (STATIC only) extract `headers`, `rewrites`, `redirects`, `allowCookies`, `allowHeaders`, `errorPagePath`, `denyQueryParams`, `allowQueryParams` from `metadata`
   - `metadata` ← strip `buildProps` and CloudFront fields from existing `metadata`
4. Drops columns `owner`, `repo`, `branch` from `services` (after backfill is verified).

---

## Implementation Order

1. **Database migration** (schema + backfill) — must be done first and deployed before any code changes go live.
2. **`common.ts` validators** — new schemas, updated metadata schemas.
3. **`schema.ts`** — updated Drizzle table definition + exported types.
4. **`app.ts` + `new.ts` validators** — updated service schemas.
5. **tRPC router** — updated mutations (`updateService`, `updateServiceMetadata`, new `updateServiceCloudfrontMetadata`, new `updateServicePipelineMetadata`).
6. **`platform.library.ts`** — updated `createBuildContext`.
7. **`useNewApplicationFlow.ts`** — updated `STACK_DEFAULTS` and `createServiceSchema`.
8. **`useApplications.ts`** — updated Supabase select query.
9. **App components** (`ServiceConfigStatic`, `ServiceConfigLambda`, `ServiceConfigFargate`) — remove `buildProps` fields.
10. **New components** (same three) — remove `buildProps` fields.
11. **App pages** (`settings.vue`, `index.vue`, `headers.vue`, `redirects.vue`) — update field references.
12. **New pages** (`configure.vue`, `deploy.vue`) — update field references.
13. **`runner/build.ts`** — verify no changes needed (context shape to CodeBuild is unchanged).

---

## Key Invariant

The CDK context object sent to CodeBuild (assembled in `platform.library.ts → createBuildContext`) must continue to have the same shape as today:

```json
{
  "metadata": {
    "env": { "account": "...", "region": "..." },
    "application": "...",
    "service": "...",
    "environment": "...",
    "rootDir": "...",
    "accessTokenSecretArn": "...",
    "sourceProps": { "owner": "...", "repo": "...", "branchOrRef": "..." },
    "buildProps": { ... },
    "outputDir": "...",         // STATIC
    "functionProps": { ... },   // LAMBDA
    "serviceProps": { ... },    // FARGATE
    "headers": [...],           // STATIC (from cloudfront_metadata)
    "rewrites": [...],          // STATIC
    "redirects": [...],         // STATIC
    ...
  }
}
```

The runner and CDK stacks (`StaticStack`, `LambdaStack`, `FargateStack`) do **not** need to change — they consume the assembled context object, not the DB columns directly.
