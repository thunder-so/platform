import { z } from 'zod';

// Shared regex pattern for name validation
export const NAME_REGEX = /^[a-zA-Z0-9]+$/;
export const NAME_ERROR_MESSAGE = 'Use letters and numbers only.';

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
      // @ts-ignore index has any type
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

export const StaticBuildPropsSchema = z.object({
  runtime: z.string().min(1, 'Runtime is required.'),
  runtime_version: z.string().optional(),
  installcmd: z.string().min(1, 'Install command is required.'),
  buildcmd: z.string().min(1, 'Build command is required.'),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

export const LambdaBuildPropsSchema = z.object({
  runtime: z.string().min(1, 'Runtime is required.'),
  runtime_version: z.string().optional(),
  installcmd: z.string().optional(),
  buildcmd: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

export const FargateBuildPropsSchema = z.object({
  buildSystem: z.enum(['Nixpacks', 'Custom Dockerfile']),
  runtime_version: z.string().optional(),
  installcmd: z.string().optional(),
  buildcmd: z.string().optional(),
  startcmd: z.string().optional(),
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

export const StaticServiceMetadataSchema = z.object({
  debug: z.boolean(),
  outputDir: z.string(),
  buildProps: StaticBuildPropsSchema,
  redirects: RedirectsSchema,
  rewrites: RewritesSchema,
  headers: HeadersSchema,
  errorPagePath: z.string(),
  allowHeaders: z.array(z.string()),
  allowCookies: z.array(z.string()),
  allowQueryParams: z.array(z.string()),
  denyQueryParams: z.array(z.string()),
});

export type StaticServiceMetadata = z.infer<typeof StaticServiceMetadataSchema>;

export const LambdaFunctionPropsSchema = z.object({
  dockerFile: z.string().optional(),
  runtime: z.string().optional(),
  architecture: z.enum(['x86', 'arm']).optional(),
  codeDir: z.string().optional(),
  handler: z.string().optional(),
  memorySize: z.number().optional(),
  timeout: z.number().optional(),
  keepWarm: z.boolean().optional(),
  reservedConcurrency: z.number().optional(),
  provisionedConcurrency: z.number().optional(),
}).superRefine((obj, ctx) => {
  const hasDocker = typeof obj.dockerFile === 'string' && obj.dockerFile.trim().length > 0;
  const hasRuntime = typeof obj.runtime === 'string' && obj.runtime.trim().length > 0;
  const hasCodeDir = typeof obj.codeDir === 'string' && obj.codeDir.trim().length > 0;
  const hasHandler = typeof obj.handler === 'string' && obj.handler.trim().length > 0;

  // If dockerFile is not provided, require runtime, codeDir and handler for zip mode
  if (!hasDocker) {
    if (!hasRuntime) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Runtime is required for zip mode.', path: ['runtime'] });
    if (!hasCodeDir) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'codeDir is required for zip mode.', path: ['codeDir'] });
    if (!hasHandler) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'handler is required for zip mode.', path: ['handler'] });
  }
});

export const LambdaServiceMetadataSchema = z.object({
  debug: z.boolean(),
  buildProps: LambdaBuildPropsSchema,
  functionProps: LambdaFunctionPropsSchema,
});

export type LambdaServiceMetadata = z.infer<typeof LambdaServiceMetadataSchema>;

export const FargateServicePropsSchema = z.object({
  dockerFile: z.string(),
  desiredCount: z.number(),
  cpu: z.number(),
  memorySize: z.number(),
  port: z.number(),
  architecture: z.enum(['x86', 'arm']).optional(),
});

export const FargateServiceMetadataSchema = z.object({
  debug: z.boolean(),
  buildProps: FargateBuildPropsSchema,
  serviceProps: FargateServicePropsSchema,
});

export type FargateServiceMetadata = z.infer<typeof FargateServiceMetadataSchema>;

export const domainSchema = z.object({
  id: z.string(),
  domain: z.string(),
  hosted_zone_id: z.string().nullable().optional(),
  global_certificate_arn: z.string().nullable().optional(),
  regional_certificate_arn: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  verified_at: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()).nullable().optional(),
  verification_method: z.string().nullable().optional(),
  verification_meta: z.any().nullable().optional(),
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

export type ProviderSchema = z.infer<typeof providerSchema>;
