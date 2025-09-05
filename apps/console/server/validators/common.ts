import { z } from 'zod';

// Shared regex pattern for name validation
export const NAME_REGEX = /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
export const NAME_ERROR_MESSAGE = 'Use letters, numbers, and hyphens. Must start with a letter.';

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

export const userAccessTokenSchema = z.object({
  secret_id: z.string().uuid(),
  resource: z.string().nullable().optional(),
  user_id: z.string().uuid(),
  environment_id: z.string().nullable().optional(),
  created_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()),
  updated_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()),
  deleted_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()).nullable().optional(),
});

export const serviceVariableSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1, 'Key is required.').regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores.'),
  value: z.string().min(1, 'Value is required.'),
  type: z.enum(['build', 'runtime']),
  service_id: z.string().optional(),
});

export const serviceSecretSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1, 'Key is required.').regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores.'),
  value: z.string().min(1, 'Value is required.'),
  resource_arn: z.string().optional(),
  type: z.enum(['build', 'runtime']),
  service_id: z.string(),
});

export const SPABuildPropsSchema = z.object({
  runtime: z.string().min(1, 'Runtime is required.'),
  runtime_version: z.union([z.string(), z.number()]).optional(),
  installcmd: z.string().min(1, 'Install command is required.'),
  buildcmd: z.string().min(1, 'Build command is required.'),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

export const DockerBasedBuildPropsSchema = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

export const RedirectsSchema = z.array(
  z.object({ 
    source: z.string().min(1, 'Source is required')
      .regex(/^\/.*$/, 'Source must start with a forward slash (/)')
      .regex(/^[a-zA-Z0-9_/-]+$/, 'Invalid characters.'),
    destination: z.string().min(1, 'Destination is required')
      .regex(/^\/.*$/, 'Destination must start with a forward slash (/)')
      .regex(/^[a-zA-Z0-9_/-]+$/, 'Invalid characters.'),
  })
);
export const RewritesSchema = z.array(
  z.object({
    source: z.string().min(1, 'Source is required')
      .regex(/^\/.*$/, 'Source must start with a forward slash (/)')
      .regex(/^[a-zA-Z0-9_/-]+$/, 'Invalid characters.'),
    destination: z.string().min(1, 'Destination is required')
      .regex(/^\/.*$/, 'Destination must start with a forward slash (/)')
      .regex(/^[a-zA-Z0-9_/-]+$/, 'Invalid characters.'),
  })
);

export const HeadersSchema = z.array(
  z.object({
    path: z.string().min(1, 'Path is required')
      .regex(/^\/.*$/, 'Path must start with a forward slash (/)')
      .regex(/^[a-zA-Z0-9_*/-]+$/, 'Invalid characters.'),
    name: z.string().min(1, 'Name is required')
      .regex(/^[a-zA-Z0-9-]+$/, 'Invalid characters in header name.'),
    value: z.string().min(1, 'Value is required'),
  })
);

export const SPAServiceMetadataSchema = z.object({
  debug: z.boolean(),
  rootDir: z.string(),
  outputDir: z.string(),
  buildProps: SPABuildPropsSchema,
  redirects: RedirectsSchema,
  rewrites: RewritesSchema,
  headers: HeadersSchema,
  errorPagePath: z.string(),
  allowHeaders: z.array(z.string()),
  allowCookies: z.array(z.string()),
  allowQueryParams: z.array(z.string()),
  denyQueryParams: z.array(z.string()),
});

export type SPAServiceMetadata = z.infer<typeof SPAServiceMetadataSchema>;

export const FunctionPropsSchema = z.object({
  memorySize: z.number(),
  timeout: z.number(),
  keepWarm: z.boolean(),
  reservedConcurrency: z.number(),
  provisionedConcurrency: z.number(),
  build_system: z.enum(['Nixpacks', 'Buildpacks', 'Custom Dockerfile']),
  dockerFile: z.string(),
});

export const FunctionServiceMetadataSchema = z.object({
  debug: z.boolean(),
  rootDir: z.string(),
  buildProps: DockerBasedBuildPropsSchema,
  functionProps: FunctionPropsSchema,
});

export type FunctionServiceMetadata = z.infer<typeof FunctionServiceMetadataSchema>;

export const WebServicePropsSchema = z.object({
  desiredCount: z.number(),
  cpu: z.number(),
  memorySize: z.number(),
  port: z.number(),
  build_system: z.enum(['Nixpacks', 'Buildpacks', 'Custom Dockerfile']),
  dockerFile: z.string(),
});

export const WebServiceMetadataSchema = z.object({
  debug: z.boolean(),
  rootDir: z.string(),
  buildProps: DockerBasedBuildPropsSchema,
  serviceProps: WebServicePropsSchema,
});

export type WebServiceMetadata = z.infer<typeof WebServiceMetadataSchema>;

export const domainSchema = z.object({
  id: z.string(),
  domain: z.string(),
  hosted_zone_id: z.string(),
  global_certificate_arn: z.string(),
  regional_certificate_arn: z.string().nullable(),
  service_id: z.string(),
});

export const providerSchema = z.object({
  id: z.string().min(1, 'Provider ID is required'),
  alias: z.string().nullable(),
  role_arn: z.string().nullable(),
  account_id: z.string().nullable(),
  region: z.string().nullable(),
  stack_id: z.string().nullable(),
  stack_name: z.string().nullable(),
  access_key_id: z.string().nullable(),
  secret_id: z.string().nullable(),
  organization_id: z.string().min(1, 'Organization ID is required'),
  created_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()),
  updated_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()).nullable(),
  deleted_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()).nullable(),
});