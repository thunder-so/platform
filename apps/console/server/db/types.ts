import { z } from 'zod';

// Base & Shared Props
export const appPropsSchema = z.object({
  rootDir: z.string().min(1, 'Project root directory is required. Defaults to /'),
  debug: z.boolean().optional(),
});

export const cloudFrontPropsSchema = z.object({
  errorPagePath: z.string().optional(),
  allowHeaders: z.array(z.string()).optional(),
  allowCookies: z.array(z.string()).optional(),
  allowQueryParams: z.array(z.string()).optional(),
  denyQueryParams: z.array(z.string()).optional(),
});

export const edgePropsSchema = z.object({
  headers: z.array(z.object({ path: z.string(), name: z.string(), value: z.string() })).optional(),
  redirects: z.array(z.object({ source: z.string(), destination: z.string() })).optional(),
  rewrites: z.array(z.object({ source: z.string(), destination: z.string() })).optional(),
});

export const sourcePropsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  branchOrRef: z.string(),
});

export const buildSystemSchema = z.enum(['Nixpacks', 'Buildpacks', 'Custom Dockerfile']);

// Shared regex pattern for name validation
const NAME_REGEX = /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const NAME_ERROR_MESSAGE = 'Use letters, numbers, and hyphens. Must start with a letter.';

export const envVarSchema = z.array(z.object({
  key: z.string().min(1, 'Key is required.').regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores.'),
  value: z.string().min(1, 'Value is required.'),
})).superRefine((items, ctx) => {
  const keyMap = new Map();
  items.forEach((item, index) => {
    const lowerKey = item.key.toLowerCase();
    if (!keyMap.has(lowerKey)) {
      keyMap.set(lowerKey, []);
    }
    keyMap.get(lowerKey).push(index);
  });

  keyMap.forEach((indices, key) => {
    if (indices.length > 1) {
      indices.forEach(index => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate key.',
          path: [index, 'key'],
        });
      });
    }
  });
});

// BuildProps: Varied by stack type
export const nodeBasedBuildPropsSchema = z.object({
  runtime: z.string().optional(),
  runtime_version: z.union([z.string(), z.number()]).optional(),
  installcmd: z.string().min(1, 'Install command is required').optional(),
  buildcmd: z.string().min(1, 'Build command is required').optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  environment: envVarSchema.optional(),
  secrets: z.array(z.object({ key: z.string(), resource: z.string() })).optional(),
});

export const dockerBasedBuildPropsSchema = z.object({
  environment: envVarSchema.optional(),
  secrets: z.array(z.object({ key: z.string(), resource: z.string() })).optional(),
  dockerBuildArgs: z.array(z.string()).optional(),
});

// DomainProps: Varied by stack type
export const spaDomainPropsSchema = z.object({
  domain: z.string().optional(),
  globalCertificateArn: z.string().optional(),
  hostedZoneId: z.string().optional(),
});

export const functionDomainPropsSchema = z.object({
  domain: z.string().optional(),
  regionalCertificateArn: z.string().optional(),
  hostedZoneId: z.string().optional(),
});

export const webServiceDomainPropsSchema = z.object({
  domain: z.string().optional(),
  globalCertificateArn: z.string().optional(),
  regionalCertificateArn: z.string().optional(),
  hostedZoneId: z.string().optional(),
});

// Metadata Props: The core configuration for each service type
export const spaMetadataSchema = z.object({
  outputDir: z.string().min(1, 'Output directory is required'),
});

export const functionMetadataSchema = z.object({
  dockerFile: z.string().optional(),
  memorySize: z.number().optional(),
  timeout: z.number().optional(),
  keepWarm: z.boolean().optional(),
  url: z.boolean().optional(),
  runtime: z.enum(['nodejs20.x', 'nodejs22.x', 'nodejs24.x']).optional(),
  architecture: z.enum(['x86_64', 'ARM_64']).optional(),
  codeDir: z.string().optional(),
  handler: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  tracing: z.boolean().optional(),
  reservedConcurrency: z.number().optional(),
  provisionedConcurrency: z.number().optional(),
  variables: envVarSchema.optional(),
  secrets: z.array(z.object({ key: z.string(), resource: z.string() })).optional(),
  dockerBuildArgs: z.array(z.string()).optional(),
  bunLayerArn: z.string().optional(),
  buildSystem: buildSystemSchema.optional()
});

export const webServiceMetadataSchema = z.object({
  dockerFile: z.string().optional(),
  desiredCount: z.number(),
  cpu: z.number().optional(),
  memorySize: z.number().optional(),
  port: z.number().optional(),
  buildSystem: buildSystemSchema.optional(),
  architecture: z.enum(['x86_64', 'ARM64']).optional(),
  variables: envVarSchema.optional(),
  secrets: z.array(z.object({ key: z.string(), resource: z.string() })).optional(),
  dockerBuildArgs: z.array(z.string()).optional(),
});

// PipelineProps: Varied by stack type
const basePipelinePropsSchema = z.object({
  sourceProps: sourcePropsSchema,
  eventBus: z.string().optional(),
  buildSpecFilePath: z.string().optional(),
});

export const spaPipelinePropsSchema = basePipelinePropsSchema.extend({
  buildProps: nodeBasedBuildPropsSchema.optional(),
});

export const functionPipelinePropsSchema = basePipelinePropsSchema.extend({
  buildProps: dockerBasedBuildPropsSchema.optional(),
});

export const webServicePipelinePropsSchema = basePipelinePropsSchema.extend({
  buildProps: dockerBasedBuildPropsSchema.optional(),
});

// Zod schema for a single service, mirroring the discriminated union in schema.ts
export const serviceSchema = z.discriminatedUnion('stack_type', [
  z.object({
    stack_type: z.literal('SPA'),
    name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
    display_name: z.string().min(1, 'Display name is required'),
    stack_version: z.string(),
    installation_id: z.number(),
    app_props: appPropsSchema,
    pipeline_props: spaPipelinePropsSchema,
    metadata: spaMetadataSchema,
    domain_props: spaDomainPropsSchema.nullable().optional(),
    edge_props: edgePropsSchema.nullable().optional(),
    cdn_props: cloudFrontPropsSchema.nullable().optional(),
  }),
  z.object({
    stack_type: z.literal('FUNCTION'),
    name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
    display_name: z.string().min(1, 'Display name is required'),
    stack_version: z.string(),
    installation_id: z.number(),
    app_props: appPropsSchema,
    pipeline_props: functionPipelinePropsSchema,
    metadata: functionMetadataSchema,
    domain_props: functionDomainPropsSchema.nullable().optional(),
    edge_props: edgePropsSchema.nullable().optional(),
    cdn_props: cloudFrontPropsSchema.nullable().optional(),
  }),
  z.object({
    stack_type: z.literal('WEB_SERVICE'),
    name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
    display_name: z.string().min(1, 'Display name is required'),
    stack_version: z.string(),
    installation_id: z.number(),
    app_props: appPropsSchema,
    pipeline_props: webServicePipelinePropsSchema,
    metadata: webServiceMetadataSchema,
    domain_props: webServiceDomainPropsSchema.nullable().optional(),
    edge_props: edgePropsSchema.nullable().optional(),
    cdn_props: cloudFrontPropsSchema.nullable().optional(),
  }),
]);

export const providerSchema = z.object({
  id: z.string().min(1, 'Provider ID is required'),
  alias: z.string(),
  role_arn: z.string().nullable(),
  account_id: z.string(),
  region: z.string(),
  stack_id: z.string().nullable(),
  stack_name: z.string().nullable(),
  access_key_id: z.string().nullable(),
  secret_id: z.string().uuid().nullable(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  organization_id: z.string().min(1, 'Organization ID is required'),
});

export const environmentSchema = z.object({
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  provider: providerSchema.optional(),
  region: z.string().min(1, 'Region is required'),
  user_access_token: z.any().optional(),
  services: z.array(serviceSchema),
});

export const applicationInputSchema = z.object({
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  environments: z.array(environmentSchema),
});

export type ApplicationInputSchema = z.infer<typeof applicationInputSchema>;
