import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { services } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  appPropsSchema,
  cloudFrontPropsSchema,
  edgePropsSchema,
  spaMetadataSchema,
  functionMetadataSchema,
  webServiceMetadataSchema,
  spaDomainPropsSchema,
  functionDomainPropsSchema,
  webServiceDomainPropsSchema,
  spaPipelinePropsSchema,
  functionPipelinePropsSchema,
  webServicePipelinePropsSchema,
} from '~/server/db/types';
import { merge } from 'lodash-es';

export const servicesRouter = router({
  updateServiceConfig: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        app_props: appPropsSchema.optional(),
        metadata: z.union([
          spaMetadataSchema,
          functionMetadataSchema,
          webServiceMetadataSchema,
        ]).optional(),
        pipeline_props: z.union([
          spaPipelinePropsSchema.deepPartial(),
          functionPipelinePropsSchema.deepPartial(),
          webServicePipelinePropsSchema.deepPartial(),
        ]).optional(),
        domain_props: z.union([
          spaDomainPropsSchema,
          functionDomainPropsSchema,
          webServiceDomainPropsSchema,
        ]).nullable().optional(),
        edge_props: edgePropsSchema.nullable().optional(),
        cdn_props: cloudFrontPropsSchema.nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...propsToUpdate } = input;

      // TODO: Add authorization checks here

      let finalProps: any = { ...propsToUpdate };

      if (propsToUpdate.pipeline_props) {
        const [currentService] = await db.select().from(services).where(eq(services.id, id));
        if (!currentService) {
          throw new Error(`Service with ID ${id} not found`);
        }
        const mergedPipelineProps = merge({}, currentService.pipeline_props, propsToUpdate.pipeline_props);
        finalProps.pipeline_props = mergedPipelineProps;
      }

      const updatedService = await db
        .update(services)
        .set(finalProps)
        .where(eq(services.id, id))
        .returning();

      if (updatedService.length === 0) {
        throw new Error(`Could not update service with ID ${id}`);
      }

      return updatedService[0];
    }),
});