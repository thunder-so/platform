import { z } from 'zod';
import {
  NAME_REGEX,
  NAME_ERROR_MESSAGE,
  serviceVariableSchema,
  serviceSecretSchema,
  domainSchema,
  SPAServiceMetadataSchema,
  FunctionServiceMetadataSchema,
  WebServiceMetadataSchema,
  providerSchema,
} from './common';

// Zod schema for a single service, mirroring the discriminated union in schema.ts
const baseServiceSchema = z.object({
  id: z.string(),
  name: z.string().regex(NAME_REGEX, NAME_ERROR_MESSAGE),
  display_name: z.string().min(1, 'Display name is required'),
  stack_type: z.enum(['SPA', 'FUNCTION', 'WEB_SERVICE']),
  stack_version: z.string(),
  owner: z.string().nullable(),
  repo: z.string().nullable(),
  branch: z.string().nullable(),
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
    stack_type: z.literal('SPA'),
    metadata: SPAServiceMetadataSchema
  }),
  serviceWithRelationsSchema.extend({
    stack_type: z.literal('FUNCTION'),
    metadata: FunctionServiceMetadataSchema
  }),
  serviceWithRelationsSchema.extend({
    stack_type: z.literal('WEB_SERVICE'),
    metadata: WebServiceMetadataSchema
  }),
]);

export const environmentSchema = z.object({
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
});

export type ApplicationSchema = z.infer<typeof applicationSchema>;