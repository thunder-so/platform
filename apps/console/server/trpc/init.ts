import { initTRPC, TRPCError } from '@trpc/server';
import { transformer } from './transformer'
import { H3Event, parseCookies } from 'h3';
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export const createTRPCContext = async (event: H3Event) => {
  const user = await serverSupabaseUser(event)
  const supabase = await serverSupabaseClient(event)
  const cookies = parseCookies(event)
  const authorization = getHeader(event, 'authorization')

  // console.log('createTRPCContext', { user, supabase, cookies, authorization })

  return { user, supabase, cookies, event, authorization }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: transformer,
  errorFormatter: opts => {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        httpStatus: 401,
        code: 'UNAUTHORIZED'
      }
    };
  },
  isServer: true,
  // isDev: true
});

/**
 * auth middlewares
 **/
const isAuthed = t.middleware(({ next, ctx }) => {
    // console.log('server/trpc/trpc', ctx.user)
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
      ctx: {
        user: ctx.user
      }
    });
});

/**
 * Procedures
 **/
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const router = t.router;
export const middleware = t.middleware;
