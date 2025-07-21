import { z } from 'zod';
import { protectedProcedure, router } from '../init';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { applications } from '~/server/db/schema';

export const applicationsRouter = router({
  createApplication: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Application name is required'),
        organizationId: z.string(),
        githubRepositoryId: z.number(),
        githubRepositoryName: z.string(),
        githubOwner: z.string(),
        githubInstallationId: z.number(),
        serviceType: z.string(),
        providerId: z.string(),
        serviceConfig: z.record(z.any()), // Flexible for different service types
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { 
        name,
        organizationId,
        githubRepositoryId,
        githubRepositoryName,
        githubOwner,
        githubInstallationId,
        serviceType,
        providerId,
        serviceConfig,
      } = input;

      try {
        // Insert application details into the applications table
        const [newApplication] = await db.insert(applications).values({
          name: name,
          displayName: name, // For now, display name is same as name
          organizationId: organizationId,
          githubRepositoryId: githubRepositoryId.toString(), // Store as string
          githubRepositoryName: githubRepositoryName,
          githubOwner: githubOwner,
          githubInstallationId: githubInstallationId,
          serviceType: serviceType,
          status: 'PENDING', // Initial status
          metadata: serviceConfig, // Store service-specific config in metadata
        }).returning();

        if (!newApplication) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create application entry.',
          });
        }

        // TODO: Trigger actual deployment process here
        console.log('Application created:', newApplication);
        console.log('Service config:', serviceConfig);

        return newApplication;
      } catch (error) {
        console.error('Error creating application:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during application creation.',
        });
      }
    }),
});
