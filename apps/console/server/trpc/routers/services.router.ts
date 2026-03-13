import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { db } from '../../db/db';
import { eq, and } from 'drizzle-orm';
import {
  services,
  serviceVariables,
  domains,
  providers,
  builds,
  events,
} from '../../db/schema';
import {
  serviceVariableSchema,
  domainSchema,
  StaticServiceMetadataSchema,
  LambdaServiceMetadataSchema,
  FargateServiceMetadataSchema,
  type ProviderSchema,
} from '../../validators/common';
import { PlatformLibrary } from '../../lib/platform.library';
import { 
  triggerPipeline,   
  getCloudWatchLogs, 
  getCloudWatchLogsFromGroup,
  lookupHostedZoneAndCerts,
  verifyDomainDns,
} from '../../lib/provider.library';
import { TRPCError } from '@trpc/server';
import GithubLibrary from '../../lib/github.library';
import { trackServerEvent } from '../../utils/analytics';

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
        region: z.string(),
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
        const logs = await getCloudWatchLogs(
          provider as ProviderSchema, 
          logGroupName, 
          logStreamName, 
          input.nextToken, 
          input.region
        );
        
        trackServerEvent('cloudwatch_logs_fetched', {
          log_group: logGroupName,
          log_stream: logStreamName,
          region: input.region,
          log_type: 'deploy'
        });
        
        return { 
          ...logs
        };
      } catch (error) {
        trackServerEvent('aws_service_failure', {
          service: 'cloudwatch',
          operation: 'getDeployLogs',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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
      if (service.stack_type === 'FARGATE') {
        logGroupName = `/webservice/${resourceIdPrefix}-logs`;
      } else {
        // Default to Lambda log group for LAMBDA stack_type and fallback
        logGroupName = `/aws/lambda/${resourceIdPrefix}-container-function`;
      }

      const logs = await getCloudWatchLogsFromGroup(
        environment.provider as ProviderSchema, 
        logGroupName, 
        input.nextToken, 
        input.startTime, 
        input.endTime, 
        environment.region as string
      );
      
      trackServerEvent('cloudwatch_logs_fetched', {
        log_group: logGroupName,
        service_id: input.service_id,
        stack_type: service.stack_type,
        log_type: 'runtime'
      });
      
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
      const service = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
        with: { environment: true }
      });
      const result = await triggerPipeline(
        providerId, 
        serviceId, 
        sha, 
        service?.environment?.region as string
      );
      
      trackServerEvent('pipeline_triggered_manual', {
        provider_id: providerId,
        service_id: serviceId,
        sha: sha || 'latest',
        region: service?.environment?.region
      });
      
      return result;
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
        stack_type: z.enum(['STATIC', 'LAMBDA', 'FARGATE']),
        metadata: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const { service_id, stack_type, metadata } = input;

      let validationSchema;
      switch (stack_type) {
        case 'STATIC':
          validationSchema = StaticServiceMetadataSchema;
          break;
        case 'LAMBDA':
          validationSchema = LambdaServiceMetadataSchema;
          break;
        case 'FARGATE':
          validationSchema = FargateServiceMetadataSchema;
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
      
      trackServerEvent('route53_lookup_performed', {
        provider_id: provider_id,
        domain: domain,
        found_hosted_zone: !!result.hosted_zone_id
      });
      
      return result;
    }),

  verifyDomain: protectedProcedure
    .input(z.object({ domain: z.string(), expectedCname: z.string().optional(), expectedTxt: z.string().optional(), service_id: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { domain, expectedCname, expectedTxt, service_id } = input;
      const result = await verifyDomainDns(domain, expectedCname, expectedTxt);

      trackServerEvent('dns_verification_performed', {
        domain: domain,
        service_id: service_id,
        verified: result.verified,
        method: result.method
      });

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
