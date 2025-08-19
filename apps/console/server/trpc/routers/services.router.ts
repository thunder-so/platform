import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { services } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { appPropsSchema, edgePropsSchema } from '~/server/db/types';

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

export const servicesRouter = router({
  updateServiceProps: protectedProcedure
    .input(z.object({
      serviceId: z.string(),
      app_props: appPropsSchema.optional(),
      cdn_props: z.record(z.any()).optional(),
      edge_props: edgePropsSchema.optional(),
      domain_props: z.record(z.any()).optional(),
      pipeline_props: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { serviceId, ...propsToUpdate } = input;
      console.log('Updating service props for serviceId:', serviceId, 'with data:', propsToUpdate);

      // Get existing service data
      const existingService = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
      });

      if (!existingService) {
        throw new Error(`Service with ID ${serviceId} not found`);
      }

      // Create update object
      const updateData: Record<string, any> = {};

      // Process each property type
      for (const propKey of Object.keys(propsToUpdate) as Array<keyof typeof propsToUpdate>) {
        if (propsToUpdate[propKey]) {
          // Get existing props (or empty object if none)
          const existingProps = existingService[propKey] || {};
          
          // Deep merge the props
          updateData[propKey] = deepMerge(existingProps, propsToUpdate[propKey]);
        }
      }

      // Only update if we have properties to update
      if (Object.keys(updateData).length > 0) {
        await db.update(services)
          .set(updateData)
          .where(eq(services.id, serviceId));
      }

      return {
        success: true,
      };
    }),
});