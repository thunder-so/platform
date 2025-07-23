import { z } from 'zod';
import { publicProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { services } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

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
  updateServiceProps: publicProcedure
    .input(z.object({
      serviceId: z.string(),
      app_props: z.object({
        rootDir: z.string().optional(),
        outputDir: z.string().optional(),
      }).optional(),
      cdn_props: z.record(z.any()).optional(),
      edge_props: z.object({
        headers: z.array(z.object({
          path: z.string(),
          name: z.string(),
          value: z.string(),
        })).optional(),
        redirects: z.array(z.object({
          source: z.string(),
          destination: z.string(),
          statusCode: z.number().optional(),
        })).optional(),
        rewrites: z.array(z.object({
          source: z.string(),
          destination: z.string(),
        })).optional(),
      }).optional(),
      domain_props: z.object({
        domain: z.string().optional(),
        globalCertificateArn: z.string().optional(),
        regionalCertificateArn: z.string().optional(),
        hostedZoneId: z.string().optional(),
      }).optional(),
      pipeline_props: z.object({
        sourceProps: z.object({
          repository: z.string().optional(),
          branch: z.string().optional(),
        }).optional(),
        buildProps: z.object({
          installcmd: z.string().optional(),
          buildcmd: z.string().optional(),
          environment: z.record(z.string()).optional(),
        }).optional(),
        eventBus: z.string().optional(),
      }).optional(),
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