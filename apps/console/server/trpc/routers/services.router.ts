import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { db } from '~/server/db/db';
import { eq, and } from 'drizzle-orm';
import {
  services,
  serviceVariables,
  domains,
  providers,
  builds,
  events,
} from '~/server/db/schema';
import {
  serviceVariableSchema,
  domainSchema,
  SPAServiceMetadataSchema,
  FunctionServiceMetadataSchema,
  WebServiceMetadataSchema,
  type ProviderSchema,
} from '~/server/validators/common';
import { PlatformLibrary } from '~/server/lib/platform.library';
import { 
  triggerPipeline,   
  getCloudWatchLogs, 
  getCloudWatchLogsFromGroup,
  lookupHostedZoneAndCerts,
  verifyDomainDns,
} from '~/server/lib/provider.library';
import { TRPCError } from '@trpc/server';
import GithubLibrary from '~/server/lib/github.library';

// Schema for creating a variable (omits id) - require service_id for DB insert
const createServiceVariableSchema = serviceVariableSchema.omit({ id: true }).extend({ service_id: z.string() });
// Schema for updating a variable (requires id)
const updateServiceVariableSchema = serviceVariableSchema.extend({ id: z.string() });

export const servicesRouter = router({
  getBuildLogs: protectedProcedure
    .input(
      z.object({
        build_log: z.any(),
        nextToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.build_log) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Build log not available.' });
      }

      const { 'group-name': logGroupName, 'stream-name': logStreamName, 'deep-link': deepLink } = input.build_log;

      if (!logGroupName || !logStreamName) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Log group or stream name not found.' });
      }

      try {
        const platform = new PlatformLibrary();
        const logs = await platform.getCloudWatchLogs(logGroupName, logStreamName, input.nextToken);
        return { 
          ...logs
        };
      } catch (error) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: error instanceof Error ? error.message : 'Failed to fetch logs'
        });
      }
    }),

  getDeployLogs: protectedProcedure
    .input(
      z.object({
        pipeline_log: z.any(),
        provider: z.any(),
        nextToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { pipeline_log, provider } = input;

      if (!pipeline_log) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pipeline log not provided.' });
      }

      const { 'group-name': logGroupName, 'stream-name': logStreamName } = pipeline_log;

      if (!logGroupName || !logStreamName) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Log group or stream name not found.' });
      }

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider information not provided.' });
      }

      try {
        const logs = await getCloudWatchLogs(provider as ProviderSchema, logGroupName, logStreamName, input.nextToken);
        return { 
          ...logs
        };
      } catch (error) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: error instanceof Error ? error.message : 'Failed to fetch logs'
        });
      }
    }),

  getRuntimeLogs: protectedProcedure
    .input(
      z.object({
        service_id: z.string(),
        nextToken: z.string().optional(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const service = await db.query.services.findFirst({
        where: eq(services.id, input.service_id),
        with: {
          environment: {
            with: {
              provider: true,
              application: true,
            },
          },
        },
      });

      if (!service) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found.' });
      }

      const { environment } = service;
      if (!environment || !environment.provider || !environment.application) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider or application not found for this service.' });
      }

      const resourceIdPrefix = `${environment.application.name.substring(0, 7)}-${service.name.substring(0, 7)}-${environment.name.substring(0, 7)}`;
      
      let logGroupName: string;
      if (service.stack_type === 'WEB_SERVICE') {
        logGroupName = `/webservice/${resourceIdPrefix}-logs`;
      } else {
        // Default to Function log group for FUNCTION stack_type and fallback
        logGroupName = `/aws/lambda/${resourceIdPrefix}-container-function`;
      }

      const logs = await getCloudWatchLogsFromGroup(environment.provider as ProviderSchema, logGroupName, input.nextToken, input.startTime, input.endTime);
      const deepLink = `https://console.aws.amazon.com/cloudwatch/home?region=${environment.region}#logsV2:log-groups/log-group/${encodeURIComponent(logGroupName)}`;
      
      return { 
        ...logs
      };
    }),

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
      // const platformLib = new PlatformLibrary();
      // await platformLib.triggerBuild(updatedService.id);

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

  // Domains
  insertDomain: protectedProcedure
    .input(domainSchema.omit({ id: true }))
    .mutation(async ({ input }) => {
      // prevent duplicate domain entries (same domain in service, not soft-deleted)
      const existing = await db.query.domains.findFirst({ 
        where: and(eq(domains.domain, input.domain), eq(domains.service_id, input.service_id))
      });
      if (existing && !existing.deleted_at) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Domain already exists.' });
      }
      return await db.insert(domains).values(input).returning();
    }),

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

  deleteDomain: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;
      const [deleted] = await db.update(domains).set({ deleted_at: new Date() }).where(eq(domains.id, id)).returning();
      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Domain not found' });
      }
      return deleted;
    }),

  listDomains: protectedProcedure
    .input(z.object({ service_id: z.string() }))
    .query(async ({ input }) => {
      const { service_id } = input;
      // return all non-deleted domains for the service
      const rows = await db.query.domains.findMany({ where: eq(domains.service_id, service_id) });
      // console.log('listDomains rows:', rows);
      if (!rows || rows.length === 0) return [];
      return rows.filter(r => !r.deleted_at);
    }),

  lookupRoute53: protectedProcedure
    .input(z.object({ provider_id: z.string(), domain: z.string() }))
    .query(async ({ input }) => {
      const { provider_id, domain } = input;
      const provider = await db.query.providers.findFirst({ where: eq(providers.id, provider_id) });
      if (!provider) throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found.' });

      const result = await lookupHostedZoneAndCerts(provider as any, domain);
      return result;
    }),

  verifyDomain: protectedProcedure
    .input(z.object({ domain: z.string(), expectedCname: z.string().optional(), expectedTxt: z.string().optional(), service_id: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { domain, expectedCname, expectedTxt, service_id } = input;
      const result = await verifyDomainDns(domain, expectedCname, expectedTxt);

      if (result.verified && service_id) {
        await db.update(domains).set({ verified: true, verified_at: new Date(), verification_method: result.method, verification_meta: result }).where(eq(domains.service_id, service_id));
      }

      return result;
    }),

  upgradeStack: protectedProcedure
    .input(
      z.object({
        service_id: z.string(),
        stack_version: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { service_id, stack_version } = input;
      
      const [updatedService] = await db
        .update(services)
        .set({ stack_version, updated_at: new Date() })
        .where(eq(services.id, service_id))
        .returning();

      if (!updatedService) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found.' });
      }

      // Trigger a new build with the updated stack version
      const platformLib = new PlatformLibrary();
      await platformLib.triggerBuild(updatedService.id);

      return updatedService;
    }),

  triggerBuild: protectedProcedure
    .input(
      z.object({
        service_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const platformLib = new PlatformLibrary();
      const build = await platformLib.triggerBuild(input.service_id);
      return build;
    }),
});