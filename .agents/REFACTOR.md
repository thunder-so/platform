# Thunder Library Refactor - Migration Plan

## Original Context

Thunder is migrating from three deprecated CDK libraries to a unified `@thunder-so/thunder` library:
- `@thunderso/cdk-spa` v0.23.12 → `@thunder-so/thunder` (Static stack)
- `@thunderso/cdk-functions` v0.7.16 → `@thunder-so/thunder` (Lambda stack)
- `@thunderso/cdk-webservice` v0.3.4 → `@thunder-so/thunder` (Fargate stack)

**Affected Components**: Console UI, Runner service, Types package, Database schema

---

## Current Status: IN PROGRESS ✅

**Last Updated**: 2025-01-20

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

### ✅ Phase 2: Console Refactoring (COMPLETED)

Comprehensive file-by-file refactoring to rename all stack type references.

#### 2.1 Server-Side Validators ✅

##### File: `server/validators/common.ts`
**Changes Completed**:
- [x] Renamed `SPABuildPropsSchema` → `StaticBuildPropsSchema`
- [x] Renamed `FunctionBuildPropsSchema` → `LambdaBuildPropsSchema`
- [x] Renamed `ServiceBuildPropsSchema` → `FargateBuildPropsSchema`
- [x] Renamed `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [x] Renamed `SPAServiceMetadata` type → `StaticServiceMetadata`
- [x] Renamed `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [x] Renamed `FunctionServiceMetadata` type → `LambdaServiceMetadata`
- [x] Renamed `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [x] Renamed `WebServiceMetadata` type → `FargateServiceMetadata`
- [x] Renamed `WebServicePropsSchema` → `FargateServicePropsSchema`
- [x] Renamed `FunctionPropsSchema` → `LambdaFunctionPropsSchema`
- [x] Updated all internal references to renamed schemas

##### File: `server/validators/new.ts`
**Changes Completed**:
- [x] Updated imports: `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [x] Updated imports: `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [x] Updated imports: `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [x] Updated discriminated union: `z.literal('SPA')` → `z.literal('STATIC')`
- [x] Updated discriminated union: `z.literal('FUNCTION')` → `z.literal('LAMBDA')`
- [x] Updated discriminated union: `z.literal('WEB_SERVICE')` → `z.literal('FARGATE')`

##### File: `server/validators/app.ts`
**Changes Completed**:
- [x] Updated imports: `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [x] Updated imports: `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [x] Updated imports: `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [x] Updated enum: `z.enum(['SPA', 'FUNCTION', 'WEB_SERVICE'])` → `z.enum(['STATIC', 'LAMBDA', 'FARGATE'])`
- [x] Updated discriminated union literals (3 places)

#### 2.2 Server-Side Routers ✅

##### File: `server/trpc/routers/services.router.ts`
**Changes Completed**:
- [x] Updated imports: `SPAServiceMetadataSchema` → `StaticServiceMetadataSchema`
- [x] Updated imports: `FunctionServiceMetadataSchema` → `LambdaServiceMetadataSchema`
- [x] Updated imports: `WebServiceMetadataSchema` → `FargateServiceMetadataSchema`
- [x] Updated log group logic: `service.stack_type === 'WEB_SERVICE'` → `service.stack_type === 'FARGATE'`
- [x] Updated enum: `z.enum(['SPA', 'FUNCTION', 'WEB_SERVICE'])` → `z.enum(['STATIC', 'LAMBDA', 'FARGATE'])`
- [x] Updated switch statement cases: `'SPA'` → `'STATIC'`, `'FUNCTION'` → `'LAMBDA'`, `'WEB_SERVICE'` → `'FARGATE'`

#### 2.3 Frontend Components ✅

##### Component File Renames
**Actions Completed**:
- [x] Renamed `app/components/app/ServiceConfigFunction.vue` → `ServiceConfigLambda.vue`
- [x] Renamed `app/components/app/ServiceConfigWeb.vue` → `ServiceConfigFargate.vue`
- [x] Renamed `app/components/new/ServiceConfigFunction.vue` → `ServiceConfigLambda.vue`
- [x] Renamed `app/components/new/ServiceConfigWeb.vue` → `ServiceConfigFargate.vue`
- [x] `ServiceConfigStatic.vue` files updated with renamed schemas

##### File: `app/components/app/ServiceConfiguration.vue`
**Changes Completed**:
- [x] Updated template: `service.stack_type === 'SPA'` → `service.stack_type === 'STATIC'`
- [x] Updated template: `service.stack_type === 'FUNCTION'` → `service.stack_type === 'LAMBDA'`
- [x] Updated template: `service.stack_type === 'WEB_SERVICE'` → `service.stack_type === 'FARGATE'`
- [x] Updated imports: `ServiceConfigFunction` → `ServiceConfigLambda`
- [x] Updated imports: `ServiceConfigWeb` → `ServiceConfigFargate`
- [x] Updated variable type logic: `stack_type === 'SPA'` → `stack_type === 'STATIC'`

##### File: `app/components/new/ServiceConfiguration.vue`
**Changes Completed**:
- [x] Updated template: `service.stack_type === 'SPA'` → `service.stack_type === 'STATIC'`
- [x] Updated template: `service.stack_type === 'FUNCTION'` → `service.stack_type === 'LAMBDA'`
- [x] Updated template: `service.stack_type === 'WEB_SERVICE'` → `service.stack_type === 'FARGATE'`
- [x] Updated imports: `ServiceConfigFunction` → `ServiceConfigLambda`
- [x] Updated imports: `ServiceConfigWeb` → `ServiceConfigFargate`
- [x] Updated variable type logic: `stack_type === 'SPA'` → `stack_type === 'STATIC'`

##### Individual Config Components
**Files Updated**:
- [x] `app/components/app/ServiceConfigStatic.vue` - Updated to use `StaticServiceMetadataSchema`
- [x] `app/components/new/ServiceConfigStatic.vue` - Updated to use `StaticServiceMetadataSchema`
- [x] `app/components/app/ServiceConfigLambda.vue` - Renamed from ServiceConfigFunction.vue
- [x] `app/components/new/ServiceConfigLambda.vue` - Renamed from ServiceConfigFunction.vue
- [x] `app/components/app/ServiceConfigFargate.vue` - Renamed from ServiceConfigWeb.vue
- [x] `app/components/new/ServiceConfigFargate.vue` - Renamed from ServiceConfigWeb.vue
- [x] `app/components/app/DomainAddModal.vue` - Updated stack type conditionals
- [x] `app/components/Header.vue` - Updated new menu items with new stack type query params

#### 2.4 Pages ✅

**Files Updated**:
- [x] `app/pages/org/[org_id]/index.vue` - Updated table cell renderer for stack types
- [x] `app/pages/new/configure.vue` - Updated stackTypeOptions values
- [x] `app/pages/new/index.vue` - Updated default stack type to 'STATIC'
- [x] `app/pages/app/[app_id]/variables.vue` - Updated variableType logic
- [x] `app/pages/app/[app_id]/headers.vue` - Updated to use StaticServiceMetadata and STATIC
- [x] `app/pages/app/[app_id]/redirects.vue` - Updated to use StaticServiceMetadata and STATIC

#### 2.5 Composables ✅

**Files Updated**:
- [x] `app/composables/useNewApplicationFlow.ts` - Updated all stack type references, STACK_DEFAULTS, and type names
- [x] `app/composables/useCommandPalette.ts` - Updated icon logic for stack types

#### 2.6 Server Libraries ✅

**Files Updated**:
- [x] `server/lib/platform.library.ts` - Updated switch statement cases for stack types

#### 2.7 Layouts ✅

**Files Updated**:
- [x] `app/layouts/new.vue` - Updated pageTitle switch statement
- [x] `app/layouts/app.vue` - Updated badges and conditional logic for stack types

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

### Phase 2: Console Refactoring ✅
- [x] Server validators updated
- [x] Server routers updated
- [x] Component files renamed
- [x] Component imports updated
- [x] Component logic updated
- [x] Pages updated
- [x] Composables updated
- [x] Server libraries updated
- [x] Layouts updated
- [x] Final verification complete

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
### ✅ Completed
**Server-Side**:
- `platform/apps/console/server/validators/common.ts` ✅
- `platform/apps/console/server/validators/new.ts` ✅
- `platform/apps/console/server/validators/app.ts` ✅
- `platform/apps/console/server/trpc/routers/services.router.ts` ✅
- `platform/apps/console/server/lib/platform.library.ts` ✅

**Frontend**:
- `platform/apps/console/app/components/app/ServiceConfiguration.vue` ✅
- `platform/apps/console/app/components/new/ServiceConfiguration.vue` ✅
- `platform/apps/console/app/components/app/ServiceConfigStatic.vue` ✅
- `platform/apps/console/app/components/app/ServiceConfigLambda.vue` ✅ (renamed)
- `platform/apps/console/app/components/app/ServiceConfigFargate.vue` ✅ (renamed)
- `platform/apps/console/app/components/new/ServiceConfigStatic.vue` ✅
- `platform/apps/console/app/components/new/ServiceConfigLambda.vue` ✅ (renamed)
- `platform/apps/console/app/components/new/ServiceConfigFargate.vue` ✅ (renamed)
- `platform/apps/console/app/components/app/DomainAddModal.vue` ✅
- `platform/apps/console/app/components/Header.vue` ✅
- `platform/apps/console/app/pages/org/[org_id]/index.vue` ✅
- `platform/apps/console/app/pages/new/index.vue` ✅
- `platform/apps/console/app/pages/new/configure.vue` ✅
- `platform/apps/console/app/pages/app/[app_id]/variables.vue` ✅
- `platform/apps/console/app/pages/app/[app_id]/headers.vue` ✅
- `platform/apps/console/app/pages/app/[app_id]/redirects.vue` ✅
- `platform/apps/console/app/composables/useNewApplicationFlow.ts` ✅
- `platform/apps/console/app/composables/useCommandPalette.ts` ✅
- `platform/apps/console/app/layouts/new.vue` ✅
- `platform/apps/console/app/layouts/app.vue` ✅

**Note**: Remaining references in `database.types.ts` and `migrations-sandbox/schema.ts` are auto-generated files and will be updated when regenerated.

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
- [x] All console references updated
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
