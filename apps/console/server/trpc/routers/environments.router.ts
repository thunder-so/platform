import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { environmentVariables } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { cuid2 } from 'drizzle-cuid2/postgres';

export const environmentsRouter = router({
  upsertEnvironmentVariable: protectedProcedure
    .input(z.object({
      id: z.string().optional(), // Optional for new variables
      environment_id: z.string(),
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { id, environment_id, key, value } = input;

      if (id) {
        // Update existing variable
        await db.update(environmentVariables)
          .set({ key, value, updated_at: new Date() })
          .where(eq(environmentVariables.id, id));
      } else {
        // Insert new variable
        await db.insert(environmentVariables).values({
          environment_id,
          key,
          value,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      return { success: true };
    }),

  deleteEnvironmentVariable: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { id } = input;
      await db.update(environmentVariables)
        .set({ deleted_at: new Date() })
        .where(eq(environmentVariables.id, id));
      return { success: true };
    }),
});