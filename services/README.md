# Thunder Services CDK Migration

This directory contains the AWS CDK infrastructure code for the Thunder services migration from AWS SAM.

## Structure

- `bin/` - CDK app entry points for each service
- `lib/` - CDK stacks and constructs for each service
  - `shared/` - Common constructs/utilities
  - `ping/`, `provider/`, `runner/`, `yeet/` - Service-specific stacks

## Migration Steps

1. Migrate each service from SAM to CDK, one at a time.
2. Reuse/refactor Lambda code from `services_sam/<service>/src/` as needed.
3. Use AWS SDK in Lambda functions for AWS resource interactions.
4. Test deployments in sandbox/staging before production.
5. Update CI/CD to use `cdk deploy`.

See project roadmap for details.
