import { z } from 'zod';
import {
  NAME_REGEX,
  NAME_ERROR_MESSAGE,
  providerSchema,
  StaticServiceMetadataSchema,
  LambdaServiceMetadataSchema,
  FargateServiceMetadataSchema,
  StaticPipelineMetadataSchema,
  LambdaPipelineMetadataSchema,
  FargatePipelineMetadataSchema,
  CloudFrontMetadataSchema,
  userAccessTokenSchema,
  serviceVariableSchema
} from './common';

/**
 * Input schema for a single service, environment and application
 */
const serviceInputBaseSchema = z.object({
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  stack_name: z.string().min(1, 'Stack name is required'),
  stack_version: z.string(),
  installation_id: z.number().nullable(),
  rootDir: z.string().default('/'),
  service_variables: z.array(serviceVariableSchema).optional(),
});

export const serviceInputSchema = z.discriminatedUnion('stack_type', [
  serviceInputBaseSchema.extend({
    stack_type: z.literal('STATIC'),
    metadata: StaticServiceMetadataSchema,
    pipeline_metadata: StaticPipelineMetadataSchema,
    cloudfront_metadata: CloudFrontMetadataSchema,
  }),
  serviceInputBaseSchema.extend({
    stack_type: z.literal('LAMBDA'),
    metadata: LambdaServiceMetadataSchema,
    pipeline_metadata: LambdaPipelineMetadataSchema,
    cloudfront_metadata: z.undefined().optional(),
  }),
  serviceInputBaseSchema.extend({
    stack_type: z.literal('FARGATE'),
    metadata: FargateServiceMetadataSchema,
    pipeline_metadata: FargatePipelineMetadataSchema,
    cloudfront_metadata: z.undefined().optional(),
  }),
]);

export type ServiceInputSchema = z.infer<typeof serviceInputSchema>;

export const environmentInputSchema = z.object({
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  provider: providerSchema.optional(),
  region: z.string().min(1, 'Region is required'),
  user_access_token: userAccessTokenSchema.optional(),
  services: z.array(serviceInputSchema),
});

export const applicationInputSchema = z.object({
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  environments: z.array(environmentInputSchema),
});

export type ApplicationInputSchema = z.infer<typeof applicationInputSchema>;
