# Thunder Library Refactor - Migration Plan

## Original Context

Thunder is migrating from three deprecated CDK libraries to a unified `@thunder-so/thunder` library:
- `@thunderso/cdk-spa` v0.23.12 → `@thunder-so/thunder` (Static stack)
- `@thunderso/cdk-functions` v0.7.16 → `@thunder-so/thunder` (Lambda stack)
- `@thunderso/cdk-webservice` v0.3.4 → `@thunder-so/thunder` (Fargate stack)

**Affected Components**: Console UI, Runner service, Types package, Database schema

---

## Current Status: IN PROGRESS ✅

**Last Updated**: 2025-01-XX

### ✅ Phase 1: Infrastructure (COMPLETED)

#### 1.1 Database Schema Migration
- **File**: `platform/apps/console/server/db/schema.ts`
- **Changes**:
  - Renamed enum values: `SPA` → `STATIC`, `FUNCTION` → `LAMBDA`, `WEB_SERVICE` → `FARGATE`
  - Migration file created manually with drizzle
  - Migration pushed to database

#### 1.2 Dependency Management
- **Action**: Moved `@thunder-so/thunder` from console package.json to monorepo root devDependencies
- **Deleted**: `platform/packages/types/` directory (no longer needed)
- **Benefit**: Types now imported directly from `@thunder-so/thunder`

#### 1.3 Runner Service Refactor
- **File**: `platform/services/runner/build.ts`
- **Changes**:
  - ✅ Imported types from `@thunder-so/thunder`: `StaticProps`, `LambdaProps`, `FargateProps`
  - ✅ Created `RunnerRequest` types using Thunder library types with `Omit<..., 'env'>`
  - ✅ Renamed all stack types: `SPA` → `STATIC`, `FUNCTION` → `LAMBDA`, `WEB_SERVICE` → `FARGATE`
  - ✅ Consolidated three separate builders into single `generateBuildSpec()` function
  - ✅ Updated repository URL to `https://github.com/thunder-so/thunder.git`
  - ✅ Updated CDK commands to use stack-specific bin files: `bin/static.ts`, `bin/lambda.ts`, `bin/fargate.ts`
  - ✅ Maintained stack-specific logic (user builds, custom runtime, Docker env)
- **Deleted**: `platform/services/runner/builders/` directory

#### 1.4 Console Configuration
- **File**: `platform/apps/console/app/app.config.ts`
- **Changes**:
  ```typescript
  stackTypes: ['STATIC', 'LAMBDA', 'FARGATE'],
  stackVersion: "1.0.4",
  ```
- **Note**: `source` property removed (not needed - runner has hardcoded repo URL)

---

### 🔄 Phase 2: Console Refactoring (IN PROGRESS)

Comprehensive file-by-file refactoring plan to rename all stack type references.

#### 2.1 Server-Side Validators

##### File: `server/validators/common.ts`
**Changes Required**:
- [ ] Rename `SPABuildPropsSchema` → `StaticBuildPropsSchema`
- [ ] Rename `FunctionBuildPropsSchema` → `LambdaBuildPropsSchema`
- [ ] Rename `ServiceBuildPropsSchema` → `FargateBuildPropsSchema`
- [ ] Rename `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [ ] Rename `SPAServiceMetadata` type → `StaticServiceMetadata`
- [ ] Rename `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [ ] Rename `FunctionServiceMetadata` type → `LambdaServiceMetadata`
- [ ] Rename `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [ ] Rename `WebServiceMetadata` type → `FargateServiceMetadata`
- [ ] Rename `WebServicePropsSchema` → `FargateServicePropsSchema`
- [ ] Update all internal references to renamed schemas

##### File: `server/validators/new.ts`
**Changes Required**:
- [ ] Update imports: `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [ ] Update imports: `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [ ] Update imports: `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [ ] Update discriminated union: `z.literal('SPA')` → `z.literal('STATIC')`
- [ ] Update discriminated union: `z.literal('FUNCTION')` → `z.literal('LAMBDA')`
- [ ] Update discriminated union: `z.literal('WEB_SERVICE')` → `z.literal('FARGATE')`

##### File: `server/validators/app.ts`
**Changes Required**:
- [ ] Update imports: `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [ ] Update imports: `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [ ] Update imports: `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [ ] Update enum: `z.enum(['SPA', 'FUNCTION', 'WEB_SERVICE'])` → `z.enum(['STATIC', 'LAMBDA', 'FARGATE'])`
- [ ] Update discriminated union literals (3 places)

#### 2.2 Server-Side Routers

##### File: `server/trpc/routers/services.router.ts`
**Changes Required**:
- [ ] Update imports: `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [ ] Update imports: `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [ ] Update imports: `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [ ] Update log group logic: `service.stack_type === 'WEB_SERVICE'` → `service.stack_type === 'FARGATE'`
- [ ] Update enum: `z.enum(['SPA', 'FUNCTION', 'WEB_SERVICE'])` → `z.enum(['STATIC', 'LAMBDA', 'FARGATE'])`
- [ ] Update switch statement cases: `'SPA'` → `'STATIC'`, `'FUNCTION'` → `'LAMBDA'`, `'WEB_SERVICE'` → `'FARGATE'`

#### 2.3 Frontend Components

##### Component File Renames
**Actions Required**:
- [ ] Rename `app/components/app/ServiceConfigFunction.vue` → `ServiceConfigLambda.vue`
- [ ] Rename `app/components/app/ServiceConfigWeb.vue` → `ServiceConfigFargate.vue`
- [ ] Rename `app/components/new/ServiceConfigFunction.vue` → `ServiceConfigLambda.vue`
- [ ] Rename `app/components/new/ServiceConfigWeb.vue` → `ServiceConfigFargate.vue`
- [ ] Keep `ServiceConfigStatic.vue` files as-is (already correct)

##### File: `app/components/app/ServiceConfiguration.vue`
**Changes Required**:
- [ ] Update template: `service.stack_type === 'SPA'` → `service.stack_type === 'STATIC'`
- [ ] Update template: `service.stack_type === 'FUNCTION'` → `service.stack_type === 'LAMBDA'`
- [ ] Update template: `service.stack_type === 'WEB_SERVICE'` → `service.stack_type === 'FARGATE'`
- [ ] Update imports: `ServiceConfigFunction` → `ServiceConfigLambda`
- [ ] Update imports: `ServiceConfigWeb` → `ServiceConfigFargate`
- [ ] Update variable type logic: `stack_type === 'SPA'` → `stack_type === 'STATIC'`

##### File: `app/components/new/ServiceConfiguration.vue`
**Changes Required**:
- [ ] Update template: `service.stack_type === 'SPA'` → `service.stack_type === 'STATIC'`
- [ ] Update template: `service.stack_type === 'FUNCTION'` → `service.stack_type === 'LAMBDA'`
- [ ] Update template: `service.stack_type === 'WEB_SERVICE'` → `service.stack_type === 'FARGATE'`
- [ ] Update imports: `ServiceConfigFunction` → `ServiceConfigLambda`
- [ ] Update imports: `ServiceConfigWeb` → `ServiceConfigFargate`
- [ ] Update variable type logic: `stack_type === 'SPA'` → `stack_type === 'STATIC'`

##### Individual Config Components
**Files to Review** (after renaming):
- [ ] `app/components/app/ServiceConfigLambda.vue` - Check for internal references
- [ ] `app/components/new/ServiceConfigLambda.vue` - Check for internal references
- [ ] `app/components/app/ServiceConfigFargate.vue` - Check for internal references
- [ ] `app/components/new/ServiceConfigFargate.vue` - Check for internal references

#### 2.4 Pages

**Directories to Search**:
- [ ] `app/pages/new/configure.vue`
- [ ] `app/pages/new/deploy.vue`
- [ ] `app/pages/new/index.vue`
- [ ] `app/pages/app/[app_id]/**/*.vue`

**Search Patterns**:
- `'SPA'` / `"SPA"` → `'STATIC'` / `"STATIC"`
- `'FUNCTION'` / `"FUNCTION"` → `'LAMBDA'` / `"LAMBDA"`
- `'WEB_SERVICE'` / `"WEB_SERVICE"` → `'FARGATE'` / `"FARGATE"`

#### 2.5 Composables

**Directory**: `app/composables/`

**Files to Check**:
- [ ] `useApplications.ts`
- [ ] `useNewApplicationFlow.ts`
- [ ] `useSaveAndRebuild.ts`
- [ ] All other composables

**Search Patterns**: Same as pages

#### 2.6 Server Libraries

**Files to Check**:
- [ ] `server/lib/platform.library.ts`
- [ ] `server/lib/provider.library.ts`
- [ ] `server/lib/github.library.ts`

**Action**: Search for stack type references and update

#### 2.7 Utilities

**Files to Check**:
- [ ] `server/utils/analytics.ts` - Update event tracking with stack types

---

### 📋 Phase 3: Testing & Validation (PENDING)

#### 3.1 Build Validation
- [ ] TypeScript compiles without errors
- [ ] Console builds successfully (`bun run build`)
- [ ] No type errors in IDE

#### 3.2 Functional Testing
- [ ] Can create new STATIC service
- [ ] Can create new LAMBDA service
- [ ] Can create new FARGATE service
- [ ] Can view existing services
- [ ] Can update service configuration
- [ ] Can trigger builds
- [ ] Can view build logs
- [ ] Can view deploy logs
- [ ] Can view runtime logs
- [ ] All tRPC endpoints work

#### 3.3 Integration Testing
- [ ] Test Static (SPA) deployment end-to-end
- [ ] Test Lambda deployment (zip mode)
- [ ] Test Lambda deployment (container mode)
- [ ] Test Fargate deployment
- [ ] Verify existing services continue working
- [ ] Test build/destroy workflows

---

### 📝 Phase 4: Documentation (PENDING)

- [ ] Update README files
- [ ] Update API documentation
- [ ] Create migration guide for users
- [ ] Update developer onboarding docs
- [ ] Update troubleshooting guides

---

## Technical Reference

### Stack Type Mapping

| Old Name | New Name | CDK Stack | Bin File |
|----------|----------|-----------|----------|
| SPA | STATIC | Static | bin/static.ts |
| FUNCTION | LAMBDA | Lambda | bin/lambda.ts |
| WEB_SERVICE | FARGATE | Fargate | bin/fargate.ts |

### Runner Service Architecture

**Unified Builder Logic** (`build.ts`):
```typescript
function generateBuildSpec(
  stackType: 'STATIC' | 'LAMBDA' | 'FARGATE',
  command: 'build' | 'delete',
  context: any,
  stackVersion: string
): string
```

**Stack-Specific Behavior**:
| Stack | User Build | Custom Runtime | Special Env |
|-------|-----------|----------------|-------------|
| STATIC | ✅ Always | ✅ Always | None |
| LAMBDA | ⚠️ Conditional (skip if Docker) | ⚠️ Conditional (only zip mode) | None |
| FARGATE | ❌ Never | ❌ Never | Docker flags, NIXPACKS_NODE_VERSION |

### Type System

**RunnerRequest Types**:
```typescript
import type { StaticProps, LambdaProps, FargateProps } from '@thunder-so/thunder';

interface RunnerRequestBase {
  metadata: {
    application: string;
    environment: string;
    service: string;
    env?: { account: string; region: string };
    // ...
  };
}

type StaticRunnerRequest = RunnerRequestBase & { 
  metadata: RunnerRequestBase['metadata'] & Omit<StaticProps, 'env'> 
};

type LambdaRunnerRequest = RunnerRequestBase & { 
  metadata: RunnerRequestBase['metadata'] & Omit<LambdaProps, 'env'> 
};

type FargateRunnerRequest = RunnerRequestBase & { 
  metadata: RunnerRequestBase['metadata'] & Omit<FargateProps, 'env'> 
};
```

### Database Schema

**Stack Type Enum**:
```typescript
export const stackTypeEnum = pgEnum('STACK_TYPE', ['STATIC', 'LAMBDA', 'FARGATE']);
```

**Services Table**:
- `stack_type`: 'STATIC' | 'LAMBDA' | 'FARGATE'
- `stack_version`: '1.0.4'
- `metadata`: JSONB (contains stack-specific props)

---

## Execution Checklist

### Phase 1: Infrastructure ✅
- [x] Database schema updated
- [x] Runner service refactored
- [x] Types consolidated
- [x] Console config updated
- [x] Builders directory deleted

### Phase 2: Console Refactoring 🔄
- [ ] Server validators updated
- [ ] Server routers updated
- [ ] Component files renamed
- [ ] Component imports updated
- [ ] Component logic updated
- [ ] Pages updated
- [ ] Composables updated
- [ ] Server libraries updated
- [ ] Final search & replace

### Phase 3: Testing 📋
- [ ] Build validation
- [ ] Functional testing
- [ ] Integration testing

### Phase 4: Documentation 📝
- [ ] README updates
- [ ] API documentation
- [ ] Migration guide
- [ ] Developer docs

---

## Search Commands for Final Sweep

```bash
# In console directory, search for old stack type references:
cd platform/apps/console

# Search for literal strings
grep -r "'SPA'" --include="*.ts" --include="*.vue" --include="*.tsx" app/ server/
grep -r '"SPA"' --include="*.ts" --include="*.vue" --include="*.tsx" app/ server/
grep -r "'FUNCTION'" --include="*.ts" --include="*.vue" --include="*.tsx" app/ server/
grep -r '"FUNCTION"' --include="*.ts" --include="*.vue" --include="*.tsx" app/ server/
grep -r "'WEB_SERVICE'" --include="*.ts" --include="*.vue" --include="*.tsx" app/ server/
grep -r '"WEB_SERVICE"' --include="*.ts" --include="*.vue" --include="*.tsx" app/ server/

# Search for type/schema names
grep -r "SPAService" --include="*.ts" --include="*.vue" app/ server/
grep -r "FunctionService" --include="*.ts" --include="*.vue" app/ server/
grep -r "WebService" --include="*.ts" --include="*.vue" app/ server/
```

---

## Key Files Modified

### ✅ Completed
- `platform/apps/console/server/db/schema.ts` - Database schema
- `platform/apps/console/app/app.config.ts` - Stack configuration
- `platform/services/runner/build.ts` - Unified builder logic
- ~~`platform/packages/types/`~~ - DELETED
- ~~`platform/services/runner/builders/`~~ - DELETED

### 🔄 In Progress
**Server-Side**:
- `platform/apps/console/server/validators/common.ts`
- `platform/apps/console/server/validators/new.ts`
- `platform/apps/console/server/validators/app.ts`
- `platform/apps/console/server/trpc/routers/services.router.ts`
- `platform/apps/console/server/lib/*.ts`
- `platform/apps/console/server/utils/analytics.ts`

**Frontend**:
- `platform/apps/console/app/components/app/ServiceConfiguration.vue`
- `platform/apps/console/app/components/new/ServiceConfiguration.vue`
- `platform/apps/console/app/components/app/ServiceConfig*.vue` (3 files)
- `platform/apps/console/app/components/new/ServiceConfig*.vue` (3 files)
- `platform/apps/console/app/pages/**/*.vue`
- `platform/apps/console/app/composables/*.ts`

---

## Migration Notes

### Breaking Changes
- Stack type enum values changed (requires database migration)
- Types package removed (import from `@thunder-so/thunder` instead)
- Builder interface removed (single function approach)
- Component file names changed

### Backward Compatibility
- ❌ Not maintained - clean break from old libraries
- Database migration handles enum value changes
- No support for old stack type names

### Deployment Considerations
1. Database migration must run first ✅
2. Runner service must be deployed before console ✅
3. Console must be fully refactored before deployment 🔄
4. Existing deployments will use new library on next build
5. No rollback to old libraries supported

---

## Success Metrics

- [x] Database schema updated
- [x] Runner service refactored
- [x] Types consolidated
- [x] Console config updated
- [ ] All console references updated
- [ ] All tests passing
- [ ] Documentation complete

---

## Rollback Plan

**Not Applicable**: This is a one-way migration. Old libraries are deprecated and will not be maintained.

If critical issues arise:
1. Fix forward - patch the new library
2. Database rollback not recommended (data loss risk)
3. Console/Runner can be reverted to previous commit temporarily
4. Fix issues incrementally and re-deploy

---

## Reference

### Thunder Library
- **Repository**: `https://github.com/thunder-so/thunder.git`
- **Version**: `v1.0.4`
- **Entry Points**: `bin/static.ts`, `bin/lambda.ts`, `bin/fargate.ts`

### Exports
```typescript
export { Static } from './stacks/StaticStack';
export { Lambda } from './stacks/LambdaStack';
export { Fargate } from './stacks/FargateStack';
export type { StaticProps } from './types/StaticProps';
export type { LambdaProps } from './types/LambdaProps';
export type { FargateProps } from './types/FargateProps';
```
