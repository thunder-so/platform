import { router, publicProcedure, protectedProcedure } from '~/server/trpc/init'
import { organizationsRouter } from './organizations.router'
import { teamRouter } from './team.router'
import { providersRouter } from './providers.router'
import { githubRouter } from './github.router'
import { servicesRouter } from './services.router'
import { environmentsRouter } from './environments.router'
import { applicationsRouter } from './applications.router'

export const appRouter = router({
  hello: publicProcedure
    .query(() => {
      return 'hello from tRPC!'
    }),
  protectedHello: protectedProcedure
    .query(({ ctx }) => {
      return `hello ${ctx.user?.email} from protected tRPC!`
    }),
  organizations: organizationsRouter,
  team: teamRouter,
  providers: providersRouter,
  github: githubRouter,
  services: servicesRouter,
  environments: environmentsRouter,
  applications: applicationsRouter,
})

export type AppRouter = typeof appRouter