import { router, publicProcedure, protectedProcedure } from '~/server/trpc/init'
import { organizationsRouter } from './organizations.router'
import { teamRouter } from './team.router';

export const appRouter = router({
  hello: publicProcedure
    .query(() => {
      return 'hello from tRPC!'
    }),
  protectedHello: protectedProcedure
    .query(({ ctx }) => {
      return `hello ${ctx.user?.email} from protected tRPC!`
    }),
  organizationsRouter: organizationsRouter,
  team: teamRouter,
})

export type AppRouter = typeof appRouter