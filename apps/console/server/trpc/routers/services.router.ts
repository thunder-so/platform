import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import {
  services,
  serviceVariables,
  domains,
} from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  serviceVariableSchema,
  domainSchema,
  SPAServiceMetadataSchema,
  FunctionServiceMetadataSchema,
  WebServiceMetadataSchema,
} from '~/server/validators/common';
import { PlatformLibrary } from '~/server/lib/platform.library';
import { triggerPipeline } from '~/server/lib/provider.library';
import { TRPCError } from '@trpc/server';
import GithubLibrary from '~/server/lib/github.library';

// Schema for creating a variable (omits id)
const createServiceVariableSchema = serviceVariableSchema.omit({ id: true });
// Schema for updating a variable (requires id)
const updateServiceVariableSchema = serviceVariableSchema.extend({
  id: z.string(),
});

export const servicesRouter = router({
  getCommits: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        installation_id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { owner, repo, branch, installation_id } = input;
      const github = new GithubLibrary();
      return await github.getCommits(owner, repo, branch, installation_id);
    }),

  triggerPipeline: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        serviceId: z.string(),
        sha: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { providerId, serviceId, sha } = input;
      return await triggerPipeline(providerId, serviceId, sha);
    }),

  updateService: protectedProcedure
    .input(
      z.object({
        service_id: z.string(),
        display_name: z.string().optional(),
        branch: z.string().optional(),
        // any other fields on the core 'services' table
      })
    )
    .mutation(async ({ input }) => {
      const { service_id, ...data } = input;
      return await db.update(services).set(data).where(eq(services.id, service_id)).returning();
    }),

  updateServiceMetadata: protectedProcedure
    .input(
      z.object({
        service_id: z.string(),
        stack_type: z.enum(['SPA', 'FUNCTION', 'WEB_SERVICE']),
        metadata: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const { service_id, stack_type, metadata } = input;

      let validationSchema;
      switch (stack_type) {
        case 'SPA':
          validationSchema = SPAServiceMetadataSchema;
          break;
        case 'FUNCTION':
          validationSchema = FunctionServiceMetadataSchema;
          break;
        case 'WEB_SERVICE':
          validationSchema = WebServiceMetadataSchema;
          break;
      }

      const parsedMetadata = validationSchema.parse(metadata);

      const [updatedService] = await db
        .update(services)
        .set({ metadata: parsedMetadata, updated_at: new Date() })
        .where(eq(services.id, service_id))
        .returning();

      if (!updatedService) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found.' });
      }

      // Trigger the build with the service ID
      const platformLib = new PlatformLibrary();
      await platformLib.triggerBuild(updatedService.id);

      return updatedService;
    }),

  // Mutations for Service Variables
  createServiceVariable: protectedProcedure
    .input(createServiceVariableSchema)
    .mutation(async ({ input }) => {
      return await db.insert(serviceVariables).values(input).returning();
    }),

  updateServiceVariable: protectedProcedure
    .input(updateServiceVariableSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.update(serviceVariables).set(data).where(eq(serviceVariables.id, id)).returning();
    }),

  deleteServiceVariable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.delete(serviceVariables).where(eq(serviceVariables.id, input.id)).returning();
    }),

  // Mutations for Domains
  upsertDomain: protectedProcedure
    .input(domainSchema.omit({ id: true }))
    .mutation(async ({ input }) => {
      const { service_id, ...data } = input;
      const existingDomain = await db.query.domains.findFirst({
        where: eq(domains.service_id, service_id),
      });

      if (existingDomain) {
        return await db.update(domains).set(data).where(eq(domains.id, existingDomain.id)).returning();
      }
      return await db.insert(domains).values(input).returning();
    }),
});