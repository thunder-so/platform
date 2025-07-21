import { z } from 'zod';
import { publicProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { environmentVariables } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { cuid2 } from 'drizzle-cuid2/postgres';

export const environmentsRouter = router({
  upsertEnvironmentVariable: publicProcedure
    .input(z.object({
      id: z.string().optional(), // Optional for new variables
      environmentId: z.string(),
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { id, environmentId, key, value } = input;

      if (id) {
        // Update existing variable
        await db.update(environmentVariables)
          .set({ key, value, updatedAt: new Date() })
          .where(eq(environmentVariables.id, id));
      } else {
        // Insert new variable
        await db.insert(environmentVariables).values({
          // id: cuid2(), // Generate new ID for new variable
          environmentId,
          key,
          value,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return { success: true };
    }),

  deleteEnvironmentVariable: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { id } = input;
      await db.update(environmentVariables)
        .set({ deletedAt: new Date() })
        .where(eq(environmentVariables.id, id));
      return { success: true };
    }),
});