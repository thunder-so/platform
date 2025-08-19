import { z } from 'zod';

// Base & Shared Props
export const appPropsSchema = z.object({
  rootDir: z.string(),
  outputDir: z.string().optional(),
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

// Environment Variables Schema with Validation and Transformation
const envVarUIObjectSchema = z.object({
  key: z.string(),
  value: z.string(),
});

// This schema validates the UI structure and transforms it to the required backend structure.
const envVarTransformSchema = z.array(envVarUIObjectSchema)
  .superRefine((items, ctx) => {
    const seen = new Set();
    items.forEach((item, index) => {
      if (!item.key) return; // Don't validate empty keys for uniqueness yet

      // Format validation
      if (!/^[a-zA-Z0-9_]+$/.test(item.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid format. Use only letters, numbers, and underscores.',
          path: [index, 'key'],
        });
      }

      // Uniqueness validation
      if (seen.has(item.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate key.`,
          path: [index, 'key'],
        });
      }
      seen.add(item.key);
    });
  })
  .transform(items =>
    items.filter(item => item.key).map(item => ({ [item.key]: item.value }))
  );


// BuildProps: Varied by stack type
export const nodeBasedBuildPropsSchema = z.object({
  runtime: z.string().optional(),
  runtime_version: z.union([z.string(), z.number()]).optional(),
  installcmd: z.string().optional(),
  buildcmd: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  environment: envVarTransformSchema.optional(),
  secrets: z.array(z.object({ key: z.string(), resource: z.string() })).optional(),
});

export const dockerBasedBuildPropsSchema = z.object({
  environment: envVarTransformSchema.optional(),
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
  outputDir: z.string(),
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
  variables: envVarTransformSchema.optional(),
  secrets: z.array(z.object({ key: z.string(), resource: z.string() })).optional(),
  dockerBuildArgs: z.array(z.string()).optional(),
  bunLayerArn: z.string().optional(),
});

export const webServiceMetadataSchema = z.object({
  dockerFile: z.string().optional(),
  desiredCount: z.number(),
  cpu: z.number().optional(),
  memorySize: z.number().optional(),
  port: z.number().optional(),
  buildSystem: buildSystemSchema.optional(),
  architecture: z.enum(['x86_64', 'ARM64']).optional(),
  variables: envVarTransformSchema.optional(),
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
  buildProps: nodeBasedBuildPropsSchema.optional(),
});

export const webServicePipelinePropsSchema = basePipelinePropsSchema.extend({
  buildProps: dockerBasedBuildPropsSchema.optional(),
});
