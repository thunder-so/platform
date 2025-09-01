import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { eq, and } from 'drizzle-orm';
import { cuid2 } from 'drizzle-cuid2/postgres';

export const environmentsRouter = router({

});