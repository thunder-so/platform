import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { services } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { 
  appPropsSchema, 
  edgePropsSchema, 
  spaDomainPropsSchema, 
  functionDomainPropsSchema, 
  webServiceDomainPropsSchema,
  spaPipelinePropsSchema,
  functionPipelinePropsSchema,
  webServicePipelinePropsSchema,
  cloudFrontPropsSchema
} from '~/server/db/types';

// Helper function to deep merge objects
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  if (!target) return source;
  
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' && 
        source[key] !== null && 
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' && 
        result[key] !== null && 
        !Array.isArray(result[key])
      ) {
        // Deep merge nested objects
        result[key] = deepMerge(result[key], source[key]);
      } else {
        // Replace or add the property
        result[key] = source[key];
      }
    }
  });
  
  return result;
}

const propsSchemaMap = {
  app_props: appPropsSchema,
  edge_props: edgePropsSchema,
  cdn_props: cloudFrontPropsSchema,
  domain_props: {
    SPA: spaDomainPropsSchema,
    FUNCTION: functionDomainPropsSchema,
    WEB_SERVICE: webServiceDomainPropsSchema,
  },
  pipeline_props: {
    SPA: spaPipelinePropsSchema,
    FUNCTION: functionPipelinePropsSchema,
    WEB_SERVICE: webServicePipelinePropsSchema,
  },
};

export const servicesRouter = router({
  updateServiceProps: protectedProcedure
    .input(z.object({
      serviceId: z.string(),
      app_props: appPropsSchema.partial().optional(),
      cdn_props: cloudFrontPropsSchema.partial().optional(),
      edge_props: edgePropsSchema.partial().optional(),
      domain_props: z.record(z.any()).optional(),
      pipeline_props: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { serviceId, ...propsToUpdate } = input;

      const existingService = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
      });

      if (!existingService) {
        throw new Error(`Service with ID ${serviceId} not found`);
      }

      const stackType = existingService.stack_type as 'SPA' | 'FUNCTION' | 'WEB_SERVICE';
      const updateData: Record<string, any> = {};

      for (const propKey of Object.keys(propsToUpdate) as Array<keyof typeof propsToUpdate>) {
        if (propsToUpdate[propKey]) {
          const existingProps = existingService[propKey] || {};
          let schema;
          if (propKey === 'domain_props' || propKey === 'pipeline_props') {
            schema = propsSchemaMap[propKey][stackType];
          } else if (propKey === 'app_props' || propKey === 'edge_props' || propKey === 'cdn_props') {
            schema = propsSchemaMap[propKey];
          }

          if (schema) {
            const validatedProps = schema.partial().parse(propsToUpdate[propKey]);
            updateData[propKey] = deepMerge(existingProps, validatedProps);
          } else {
            updateData[propKey] = deepMerge(existingProps, propsToUpdate[propKey]);
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(services)
          .set(updateData)
          .where(eq(services.id, serviceId));
      }

      return {
        success: true,
      };
    }),

  // updateServiceConfig: protectedProcedure
  //   .input(updateServiceConfigInput)
  //   .mutation(async ({ input }) => {
  //     const { serviceId, stack_type, app_props, metadata, pipeline_props } = input;

  //     const updatedService = await db.update(services)
  //       .set({
  //         app_props,
  //         metadata,
  //         pipeline_props
  //       })
  //       .where(eq(services.id, serviceId))
  //       .returning();

  //     if (updatedService.length === 0) {
  //       throw new Error(`Could not update service with ID ${serviceId}`);
  //     }

  //     return updatedService[0];
  //   }),
});