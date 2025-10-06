import { SQSClient, SendMessageCommand, MessageAttributeValue } from '@aws-sdk/client-sqs';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { TRPCError } from '@trpc/server';
import { builds, services, type Build, type Application, type Environment, type Provider, type ServiceVariable } from '../db/schema';
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
  private sqsClient?: SQSClient;
  private ssmClient?: SSMClient;
  private cloudWatchLogsClient?: CloudWatchLogsClient;
  // Clients for assumed runner role
  private assumedSqsClient?: SQSClient;
  private assumedSsmClient?: SSMClient;
  private assumedCloudWatchLogsClient?: CloudWatchLogsClient;
  // Cache assumed role credentials and expiry
  private assumedCreds?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; expiration?: Date };
  private readonly logger: Logger;

  constructor() {
    this.logger = {
      error: (message: string, context?: any) => console.error(`[ERROR] ${message}`, context ? { context } : ''),
      info: (message: string, context?: any) => console.log(`[INFO] ${message}`, context ? { context } : ''),
      warn: (message: string, context?: any) => console.warn(`[WARN] ${message}`, context ? { context } : ''),
    };
  }

  private getSqsClient(): SQSClient {
    // If there's a runner assume role configured and valid cached creds, return assumed client
    const runnerRoleArn = process.env.RUNNER_ASSUME_ROLE_ARN;
    if (runnerRoleArn && this.isAssumedCredsValid()) {
      if (!this.assumedSqsClient) {
        this.assumedSqsClient = new SQSClient({
          credentials: {
            accessKeyId: this.assumedCreds!.accessKeyId,
            secretAccessKey: this.assumedCreds!.secretAccessKey,
            sessionToken: this.assumedCreds!.sessionToken,
          },
          region: process.env.RUNNER_REGION || process.env.AWS_REGION,
        });
      }
      return this.assumedSqsClient;
    }

    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({});
    }
    return this.sqsClient;
  }

  private getSsmClient(): SSMClient {
    const runnerRoleArn = process.env.RUNNER_ASSUME_ROLE_ARN;
    if (runnerRoleArn && this.isAssumedCredsValid()) {
      if (!this.assumedSsmClient) {
        this.assumedSsmClient = new SSMClient({
          credentials: {
            accessKeyId: this.assumedCreds!.accessKeyId,
            secretAccessKey: this.assumedCreds!.secretAccessKey,
            sessionToken: this.assumedCreds!.sessionToken,
          },
          region: process.env.RUNNER_REGION || process.env.AWS_REGION,
        });
      }
      return this.assumedSsmClient;
    }

    if (!this.ssmClient) {
      this.ssmClient = new SSMClient({});
    }
    return this.ssmClient;
  }

  private getCloudWatchLogsClient(): CloudWatchLogsClient {
    const runnerRoleArn = process.env.RUNNER_ASSUME_ROLE_ARN;
    if (runnerRoleArn && this.isAssumedCredsValid()) {
      if (!this.assumedCloudWatchLogsClient) {
        this.assumedCloudWatchLogsClient = new CloudWatchLogsClient({
          credentials: {
            accessKeyId: this.assumedCreds!.accessKeyId,
            secretAccessKey: this.assumedCreds!.secretAccessKey,
            sessionToken: this.assumedCreds!.sessionToken,
          },
          region: process.env.RUNNER_REGION || process.env.AWS_REGION,
        });
      }
      return this.assumedCloudWatchLogsClient;
    }

    if (!this.cloudWatchLogsClient) {
      this.cloudWatchLogsClient = new CloudWatchLogsClient({});
    }
    return this.cloudWatchLogsClient;
  }

  private isAssumedCredsValid(): boolean {
    if (!this.assumedCreds) return false;
    if (!this.assumedCreds.expiration) return true; // session without expiration considered valid
    const now = new Date();
    // add a safety window of 60 seconds
    return now.getTime() + 60000 < this.assumedCreds.expiration.getTime();
  }

  // Force assume role and refresh cached creds/clients
  private async assumeRunnerRoleIfNeeded(): Promise<void> {
    const runnerRoleArn = process.env.RUNNER_ASSUME_ROLE_ARN;
    if (!runnerRoleArn) return;

    if (this.isAssumedCredsValid()) return;

    const sts = new STSClient({});
    const assumed = await sts.send(new AssumeRoleCommand({
      RoleArn: runnerRoleArn,
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

    // reset assumed clients so they'll be recreated with new credentials
    this.assumedSqsClient = undefined;
    this.assumedSsmClient = undefined;
    this.assumedCloudWatchLogsClient = undefined;
  }

  async getCloudWatchLogs(logGroupName: string, logStreamName: string, nextToken?: string) {
    try {
      // Ensure assumed role credentials are available if configured
      await this.assumeRunnerRoleIfNeeded();

      const client = this.getCloudWatchLogsClient();
      const command = new GetLogEventsCommand({
        logGroupName: logGroupName,
        logStreamName: logStreamName,
        startFromHead: true,
        nextToken: nextToken,
      });
      const response = await client.send(command);
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

  /**
   * Send SQS message with proper error handling and validation
   */
  async sendSqsMessage(
    queueUrl: string,
    messageBody: string,
    messageGroupId: string,
    messageAttributes?: Record<string, MessageAttributeValue>
  ): Promise<void> {
    try {
      // Ensure assumed role credentials are available if configured
      await this.assumeRunnerRoleIfNeeded();

      await this.getSqsClient().send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageGroupId,
        MessageAttributes: messageAttributes,
      }));

      this.logger.info('SQS message sent successfully', { messageGroupId, messageBody });
    } catch (error) {
      this.logger.error('Failed to send SQS message', { messageGroupId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send message to SQS queue.',
      });
    }
  }

  /**
   * Create or update SSM parameter with validation
   */
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
      // Ensure assumed role credentials are available if configured
      await this.assumeRunnerRoleIfNeeded();

      await this.getSsmClient().send(new PutParameterCommand({
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

  async triggerBuild(serviceId: string): Promise<Build> {
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

    // Create build record
    const [newBuild] = await db.insert(builds).values({
      service_id: serviceData.id,
      environment_id: environment.id,
      build_status: 'IN_PROGRESS',
      build_context: context,
    }).returning();

    if (!newBuild) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create build entry.',
      });
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
      eventId: { DataType: 'String', StringValue: newBuild.id },
      accessTokenSecretArn: { DataType: 'String', StringValue: accessTokenSecretArn },
      provider: { DataType: 'String', StringValue: JSON.stringify(provider) },
    };

    // Send build message
    await this.sendSqsMessage(
      runnerServiceQueueUrl,
      JSON.stringify(context),
      newBuild.id,
      messageAttributes
    );

    return newBuild;
  }
}
