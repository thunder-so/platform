import { z } from 'zod';
import {
  NAME_REGEX,
  NAME_ERROR_MESSAGE,
  serviceVariableSchema,
  serviceSecretSchema,
  domainSchema,
  StaticServiceMetadataSchema,
  LambdaServiceMetadataSchema,
  FargateServiceMetadataSchema,
  StaticPipelineMetadataSchema,
  LambdaPipelineMetadataSchema,
  FargatePipelineMetadataSchema,
  CloudFrontMetadataSchema,
  providerSchema,
} from './common';

// Zod schema for a single service, mirroring the discriminated union in schema.ts
const baseServiceSchema = z.object({
  id: z.string(),
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  stack_name: z.string().min(1, 'Stack name is required'),
  stack_type: z.enum(['STATIC', 'LAMBDA', 'FARGATE']),
  stack_version: z.string(),
  rootDir: z.string().default('/'),
  resources: z.record(z.any()).nullable(),
  environment_id: z.string(),
  installation_id: z.number().nullable(),
});

const serviceWithRelationsSchema = baseServiceSchema.extend({
  service_variables: z.array(serviceVariableSchema).optional(),
  service_secrets: z.array(serviceSecretSchema).optional(),
  domains: z.array(domainSchema).optional(),
});

export const serviceSchema = z.discriminatedUnion('stack_type', [
  serviceWithRelationsSchema.extend({
    stack_type: z.literal('STATIC'),
    metadata: StaticServiceMetadataSchema,
    pipeline_metadata: StaticPipelineMetadataSchema,
    cloudfront_metadata: CloudFrontMetadataSchema,
  }),
  serviceWithRelationsSchema.extend({
    stack_type: z.literal('LAMBDA'),
    metadata: LambdaServiceMetadataSchema,
    pipeline_metadata: LambdaPipelineMetadataSchema,
    cloudfront_metadata: z.undefined().optional(),
  }),
  serviceWithRelationsSchema.extend({
    stack_type: z.literal('FARGATE'),
    metadata: FargateServiceMetadataSchema,
    pipeline_metadata: FargatePipelineMetadataSchema,
    cloudfront_metadata: z.undefined().optional(),
  }),
]);

export const environmentSchema = z.object({
  id: z.string(),
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  provider: providerSchema.optional(),
  region: z.string().min(1, 'Region is required'),
  user_access_token: z.string().nullable(),
  services: z.array(serviceSchema),
});

export const applicationSchema = z.object({
  id: z.string(),
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  environments: z.array(environmentSchema),
  organization_id: z.string(),
});

export type ServiceSchema = z.infer<typeof serviceSchema>;
export type EnvironmentSchema = z.infer<typeof environmentSchema>;
export type ApplicationSchema = z.infer<typeof applicationSchema>;
