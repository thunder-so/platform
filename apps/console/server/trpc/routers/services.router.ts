import { z } from 'zod';
import { publicProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { services } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export const servicesRouter = router({
  updatePipelineProps: publicProcedure
    .input(z.object({
      serviceId: z.string(),
      appProps: z.object({
        rootDir: z.string().optional(),
        outputDir: z.string().optional(),
      }).optional(),
      pipelineProps: z.object({
        sourceProps: z.object({
          owner: z.string().optional(),
          repo: z.string().optional(),
          branch: z.string().optional(),
        }).optional(),
        buildProps: z.object({
          runtime: z.string().optional(),
          runtime_version: z.union([z.string(), z.number()]).optional(),
          installcmd: z.string().optional(),
          buildcmd: z.string().optional(),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const { serviceId, appProps, pipelineProps } = input;

      const existingService = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
        columns: { appProps: true, pipelineProps: true },
      });

      const mergedAppProps = {
        ...(existingService?.appProps as object || {}),
        ...appProps,
      };

      const currentPipelineProps = (existingService?.pipelineProps || {}) as {
        sourceProps?: { owner?: string; repo?: string; branch?: string };
        buildProps?: { runtime?: string; runtime_version?: string | number; installcmd?: string; buildcmd?: string };
      };

      const mergedPipelineProps = {
        sourceProps: pipelineProps?.sourceProps !== undefined
          ? { ...(currentPipelineProps.sourceProps || {}), ...pipelineProps.sourceProps }
          : currentPipelineProps.sourceProps,
        buildProps: pipelineProps?.buildProps !== undefined
          ? { ...(currentPipelineProps.buildProps || {}), ...pipelineProps.buildProps }
          : currentPipelineProps.buildProps,
      };

      await db.update(services)
        .set({ 
          appProps: mergedAppProps, 
          pipelineProps: mergedPipelineProps 
        })
        .where(eq(services.id, serviceId));

      return {
        success: true,
      };
    }),
    
  updateDomainProps: publicProcedure
    .input(z.object({
      serviceId: z.string(),
      domainProps: z.object({
        domain: z.string().optional(),
        globalCertificateArn: z.string().optional(),
        regionalCertificateArn: z.string().optional(),
        hostedZoneId: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { serviceId, domainProps } = input;

      // const existingService = await db.query.services.findFirst({
      //   where: eq(services.id, serviceId),
      //   columns: { domainProps: true },
      // });

      // const mergedDomainProps = {
      //   ...(existingService?.domainProps as object || {}),
      //   ...domainProps,
      // };

      await db.update(services)
        .set({ domainProps: domainProps })
        .where(eq(services.id, serviceId));

      return {
        success: true,
      };
    }),

  updateEdgeProps: publicProcedure
    .input(z.object({
      serviceId: z.string(),
      edgeProps: z.object({
        headers: z.array(z.object({
          path: z.string(),
          name: z.string(),
          value: z.string(),
        })).optional(),
        redirects: z.array(z.object({
          source: z.string(),
          destination: z.string(),
          type: z.number(),
        })).optional(),
        rewrites: z.array(z.object({
          source: z.string(),
          destination: z.string(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { serviceId, edgeProps } = input;

      const existingService = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
        columns: { edgeProps: true },
      });

      const currentEdgeProps = (existingService?.edgeProps || {}) as {
        headers?: { path: string; name: string; value: string }[];
        redirects?: { source: string; destination: string; type: number }[];
        rewrites?: { source: string; destination: string }[];
      };

      const mergedEdgeProps = {
        headers: edgeProps.headers !== undefined ? edgeProps.headers : currentEdgeProps.headers,
        redirects: edgeProps.redirects !== undefined ? edgeProps.redirects : currentEdgeProps.redirects,
        rewrites: edgeProps.rewrites !== undefined ? edgeProps.rewrites : currentEdgeProps.rewrites,
      };

      await db.update(services)
        .set({ edgeProps: mergedEdgeProps })
        .where(eq(services.id, serviceId));

      return {
        success: true,
      };
    }),
});