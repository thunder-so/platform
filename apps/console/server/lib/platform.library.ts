import { SQSClient, SendMessageCommand, MessageAttributeValue } from '@aws-sdk/client-sqs';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { TRPCError } from '@trpc/server';
import { builds, destroys, services, type Build, type Application, type Environment, type Provider, type ServiceVariable } from '../db/schema';
import { db } from '../db/db';
import { eq } from 'drizzle-orm';
import { ServiceSchema } from '../validators/app';

// Types for better type safety
interface BuildContext {
  metadata: {
    env: {
      account: string;
      region: string;
    };
    sourceProps: {
      owner: string;
      repo: string;
      branchOrRef: string;
    };
    application: string;
    service: string;
    environment: string;
    [key: string]: any;
  }
}

// Logger interface for better abstraction
interface Logger {
  error(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
}

type Service = ServiceSchema & { serviceVariables: ServiceVariable[] };

export class PlatformLibrary {
  private clients: {
    sqs?: SQSClient;
    ssm?: SSMClient;
    cloudWatchLogs?: CloudWatchLogsClient;
  } = {};
  private assumedCreds?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; expiration?: Date };
  private readonly logger: Logger;
  private readonly usesCrossAccount: boolean;

  constructor() {
    this.logger = {
      error: (message: string, context?: any) => console.error(`[ERROR] ${message}`, context ? { context } : ''),
      info: (message: string, context?: any) => console.log(`[INFO] ${message}`, context ? { context } : ''),
      warn: (message: string, context?: any) => console.warn(`[WARN] ${message}`, context ? { context } : ''),
    };
    this.usesCrossAccount = !!process.env.RUNNER_ASSUME_ROLE_ARN;
  }

  private async getCredentials() {
    if (!this.usesCrossAccount) return undefined;
    
    if (this.isAssumedCredsValid()) return this.assumedCreds;
    
    const sts = new STSClient({});
    const assumed = await sts.send(new AssumeRoleCommand({
      RoleArn: process.env.RUNNER_ASSUME_ROLE_ARN!,
      RoleSessionName: `PlatformAssume-${Date.now()}`,
    }));
    
    const creds = assumed.Credentials;
    if (!creds) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to assume runner role.' });

    this.assumedCreds = {
      accessKeyId: creds.AccessKeyId as string,
      secretAccessKey: creds.SecretAccessKey as string,
      sessionToken: creds.SessionToken,
      expiration: creds.Expiration ? new Date(creds.Expiration) : undefined,
    };
    
    // Reset clients to use new credentials
    this.clients = {};
    return this.assumedCreds;
  }

  private isAssumedCredsValid(): boolean {
    if (!this.assumedCreds) return false;
    if (!this.assumedCreds.expiration) return true;
    return new Date().getTime() + 60000 < this.assumedCreds.expiration.getTime();
  }

  private async getClient<T>(type: 'sqs' | 'ssm' | 'cloudWatchLogs', ClientClass: new (config: any) => T): Promise<T> {
    if (!this.clients[type]) {
      const credentials = await this.getCredentials();
      const config = credentials ? {
        credentials,
        region: process.env.RUNNER_REGION || process.env.AWS_REGION,
      } : {};
      this.clients[type] = new ClientClass(config) as any;
    }
    return this.clients[type] as T;
  }

  async getCloudWatchLogs(logGroupName: string, logStreamName: string, nextToken?: string) {
    try {
      const client = await this.getClient('cloudWatchLogs', CloudWatchLogsClient);
      const response = await client.send(new GetLogEventsCommand({
        logGroupName,
        logStreamName,
        startFromHead: true,
        nextToken,
      }));
      return {
        events: response.events || [],
        nextForwardToken: response.nextForwardToken,
      };
    } catch (error) {
      console.error('Error fetching logs from CloudWatch:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch logs from CloudWatch.',
      });
    }
  }

  async sendSqsMessage(
    queueUrl: string,
    messageBody: string,
    messageGroupId: string,
    messageAttributes?: Record<string, MessageAttributeValue>
  ): Promise<void> {
    try {
      const client = await this.getClient('sqs', SQSClient);
      await client.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageGroupId,
        MessageAttributes: messageAttributes,
      }));
      this.logger.info('SQS message sent successfully', { messageGroupId });
    } catch (error) {
      this.logger.error('Failed to send SQS message', { messageGroupId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send message to SQS queue.',
      });
    }
  }

  async createSsmSecureParameter(name: string, value: string): Promise<void> {
    if (!name?.trim()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Parameter name is required and cannot be empty.',
      });
    }

    if (!value?.trim()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Parameter value is required and cannot be empty.',
      });
    }

    try {
      const client = await this.getClient('ssm', SSMClient);
      await client.send(new PutParameterCommand({
        Name: name,
        Value: value,
        Type: 'SecureString',
        Overwrite: true,
      }));
      this.logger.info('SSM parameter created successfully', { parameterName: name });
    } catch (error) {
      this.logger.error('Failed to create SSM parameter', { parameterName: name });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create secure parameter in AWS SSM Parameter Store.',
      });
    }
  }

  private createBuildContext(
    application: Application,
    environment: Environment,
    service: Service,
    provider: Provider,
    accessTokenSecretArn: string,
  ): BuildContext {    
    const context: BuildContext = {
      metadata: {
        ...service.metadata,
        env: {
          region: environment.region as string,
          account: provider.account_id as string,
        },
        application: application.name,
        service: service.name,
        environment: environment.name,
        sourceProps: {
          owner: service.owner as string,
          repo: service.repo as string,
          branchOrRef: service.branch as string,
        },
        accessTokenSecretArn: accessTokenSecretArn,
      },
    };

    if (service.serviceVariables?.length > 0) {
      const { buildVars, runtimeVars } = service.serviceVariables.reduce(
        (acc, variable) => {
          if (variable.type === 'build') {
            acc.buildVars[variable.key] = variable.value;
          } else if (variable.type === 'runtime') {
            acc.runtimeVars[variable.key] = variable.value;
          }
          return acc;
        },
        { buildVars: {} as Record<string, string>, runtimeVars: {} as Record<string, string> }
      );

      switch (service.stack_type) {
        case 'SPA':
          context.metadata.buildProps = { ...context.metadata.buildProps, environment: buildVars };
          break;
        case 'FUNCTION':
          context.metadata.functionProps = { variables: runtimeVars };
          break;
        case 'WEB_SERVICE':
          context.metadata.serviceProps = { variables: runtimeVars };
          break;
      }
    }

    return context;
  }

  async triggerBuild(serviceId: string, command?: string): Promise<string> {
    if (!serviceId?.trim()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Service ID is required and cannot be empty.',
      });
    }

    // Hydrate the full application context
    const serviceData = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
      with: {
        serviceVariables: true,
        environment: {
          with: {
            application: true,
            provider: true,
            userAccessTokens: {
              columns: {
                resource: true,
              },
            },
          },
        },
      },
    });

    if (!serviceData?.environment?.application || !serviceData.environment.provider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Could not fully load application context for build.',
      });
    }

    // Safe array access with validation
    const userAccessTokens = serviceData.environment.userAccessTokens;
    if (!userAccessTokens?.length) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No access tokens found for environment.',
      });
    }

    const accessTokenSecretArn = userAccessTokens[0].resource;
    if (!accessTokenSecretArn) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Access token secret ARN not found for environment.',
      });
    }

    const { environment, environment: { application, provider } } = serviceData;
    const context = this.createBuildContext(application, environment, serviceData as Service, provider, accessTokenSecretArn);

    let eventId: string | undefined = undefined;
    if (command === 'delete') {
      // Create destroy record if command is delete
      const [newDestroy] = await db.insert(destroys).values({
        service_id: serviceData.id,
        environment_id: (await db.query.services.findFirst({
          where: eq(services.id, serviceData.id),
          columns: { id: true },
          with: { environment: { columns: { id: true } } }
        }))?.environment?.id!,
        destroy_status: 'IN_PROGRESS',
        destroy_context: context,
      }).returning({ id: destroys.id });

      eventId = newDestroy.id;

      if (!newDestroy) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to create destroy entry.' 
        });
      }

    } else {
      // Create build record
      const [newBuild] = await db.insert(builds).values({
        service_id: serviceData.id,
        environment_id: environment.id,
        build_status: 'IN_PROGRESS',
        build_context: context,
      }).returning();

      eventId = newBuild.id;

      if (!newBuild) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create build entry.',
        });
      }
    }

    // Validate environment configuration
    const runnerServiceQueueUrl = process.env.RUNNER_SERVICE;
    if (!runnerServiceQueueUrl) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Runner SQS queue URL is not configured.',
      });
    }

    // Prepare message attributes
    const messageAttributes: Record<string, MessageAttributeValue> = {
      stackType: { DataType: 'String', StringValue: serviceData.stack_type },
      stackVersion: { DataType: 'String', StringValue: serviceData.stack_version },
      eventId: { DataType: 'String', StringValue: eventId },
      accessTokenSecretArn: { DataType: 'String', StringValue: accessTokenSecretArn },
      provider: { DataType: 'String', StringValue: JSON.stringify(provider) },
      ...command ? { command: { DataType: 'String', StringValue: command } } : {},
    };

    // Send build message
    await this.sendSqsMessage(
      runnerServiceQueueUrl,
      JSON.stringify(context),
      eventId,
      messageAttributes
    );

    return eventId;
  }
}
