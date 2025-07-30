// ================================================================= //
// ==================== COMMON & SHARED PROPS ====================== //
// ================================================================= //

/**
 * Base properties required for every build request, regardless of stack type.
 * This includes application identifiers and CI/CD pipeline configuration.
 */
interface BaseBuildRequest {
  eventId: string;
  provider: {
    roleArn: string;
    externalId: string;
    accountId: string;
    region: string;
    accessKeyId?: string;
  };
  stackVersion: string;
  env: {
    account: string;
    region: string;
  };
  application: string;
  service: string;
  environment: string;
  rootDir: string;
  sourceProps: {
    owner: string;
    repo: string;
    branchOrRef: string;
  };
  accessTokenSecretArn: string;
}

/**
 * A unified structure for domain and certificate configuration.
 */
interface DomainPayload {
  domain?: string;
  hostedZoneId?: string;
  globalCertificateArn?: string;
  regionalCertificateArn?: string;
}

/**
 * Configuration for the AWS CodeBuild process.
 */
interface BuildPropsPayload {
  runtime?: 'nodejs' | 'python' | 'java' | 'go';
  runtime_version?: string | number;
  installcmd?: string;
  buildcmd?: string;
}

/**
 * Configuration for the CloudFront distribution.
 * Used by SPA and ECS stacks.
 */
interface CdnPayload {
  errorPagePath?: string;
  allowHeaders?: string[];
  allowCookies?: string[];
  allowQueryParams?: string[];
  denyQueryParams?: string[];
}

/**
 * Configuration for CloudFront edge functions (redirects and rewrites).
 * Used by the SPA stack.
 */
interface EdgePayload {
  redirects?: { source: string; destination: string }[];
  rewrites?: { source: string; destination: string }[];
  headers?: { path: string; name: string; value: string }[];
}

// ================================================================= //
// =================== STACK-SPECIFIC PAYLOADS ===================== //
// ================================================================= //

/**
 * Nested payload for Lambda-specific properties.
 * All Lambdas are deployed as container images.
 */
interface FunctionPropsPayload {
  dockerFile: string;
  timeout?: number;
  memorySize?: number;
  keepWarm?: boolean;
}

/**
 * Nested payload for ECS-specific properties, matching the CDK construct.
 */
interface ServicePropsPayload {
  port: number;
  dockerFile: string;
  cpu?: number;
  memorySize?: number;
  desiredCount?: number;
}

/**
 * The specific configuration payload for a Single Page Application (SPA) stack.
 */
interface SpaPayload {
  outputDir: string;
  buildProps?: BuildPropsPayload;
  domain?: DomainPayload;
  cdn?: CdnPayload;
  edge?: EdgePayload;
}

/**
 * The specific configuration payload for a Lambda Function stack.
 */
interface LambdaPayload {
  functionProps: FunctionPropsPayload;
  buildProps?: BuildPropsPayload;
  domain?: DomainPayload;
}

/**
 * The specific configuration payload for an ECS Fargate Web Service stack.
 */
interface EcsPayload {
  serviceProps: ServicePropsPayload;
  buildProps?: BuildPropsPayload;
  domain?: DomainPayload;
  cdn?: CdnPayload;
}

// ================================================================= //
// =================== DISCRIMINATED UNION ========================= //
// ================================================================= //

/**
 * The final BuildRequest type.
 * This is a discriminated union that combines the base request with a
 * stack-specific payload, determined by the `stackType` property.
 */
export type BuildRequest =
  | (BaseBuildRequest & { stackType: 'SPA'; props: SpaPayload })
  | (BaseBuildRequest & { stackType: 'LAMBDA'; props: LambdaPayload })
  | (BaseBuildRequest & { stackType: 'ECS'; props: EcsPayload });