import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { services } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { serviceSchema } from '~/server/db/types';

export const servicesRouter = router({
  updateServiceConfig: protectedProcedure
    .input(serviceSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, app_props, metadata, pipeline_props, domain_props, edge_props, cdn_props } = input;

      // TODO: Add authorization checks here

      const updatedService = await db.update(services)
        .set({
          app_props,
          metadata,
          pipeline_props,
          domain_props,
          edge_props,
          cdn_props
        })
        .where(eq(services.id, id))
        .returning();

      if (updatedService.length === 0) {
        throw new Error(`Could not update service with ID ${id}`);
      }

      return updatedService[0];
    }),
});