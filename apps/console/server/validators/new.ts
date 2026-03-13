import { z } from 'zod';
import {
  NAME_REGEX,
  NAME_ERROR_MESSAGE,
  providerSchema,
  StaticServiceMetadataSchema,
  LambdaServiceMetadataSchema,
  FargateServiceMetadataSchema,
  userAccessTokenSchema,
  serviceVariableSchema
} from './common';

/**
 * Input schema for a single service, environment and application
 */
const serviceInputBaseSchema = z.object({
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  stack_version: z.string(),
  owner: z.string().nullable(),
  repo: z.string().nullable(),
  branch: z.string().nullable(),
  installation_id: z.number().nullable(),
  service_variables: z.array(serviceVariableSchema).optional(),
});

export const serviceInputSchema = z.discriminatedUnion('stack_type', [
  serviceInputBaseSchema.extend({
    stack_type: z.literal('STATIC'),
    metadata: StaticServiceMetadataSchema,
  }),
  serviceInputBaseSchema.extend({
    stack_type: z.literal('LAMBDA'),
    metadata: LambdaServiceMetadataSchema,
  }),
  serviceInputBaseSchema.extend({
    stack_type: z.literal('FARGATE'),
    metadata: FargateServiceMetadataSchema,
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
