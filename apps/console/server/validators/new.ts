import { z } from 'zod';
import {
  NAME_REGEX,
  NAME_ERROR_MESSAGE,
  providerSchema,
  SPAServiceMetadataSchema,
  FunctionServiceMetadataSchema,
  WebServiceMetadataSchema,
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
  service_variables: z.array(serviceVariableSchema).optional(),
});

export const serviceInputSchema = z.discriminatedUnion('stack_type', [
  serviceInputBaseSchema.extend({
    stack_type: z.literal('SPA'),
    metadata: SPAServiceMetadataSchema,
  }),
  serviceInputBaseSchema.extend({
    stack_type: z.literal('FUNCTION'),
    metadata: FunctionServiceMetadataSchema,
  }),
  serviceInputBaseSchema.extend({
    stack_type: z.literal('WEB_SERVICE'),
    metadata: WebServiceMetadataSchema,
  }),
]);

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