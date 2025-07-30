import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand, ResourceExistsException } from '@aws-sdk/client-secrets-manager';
import { TRPCError } from '@trpc/server';

export class AwsLibrary {
  private _accessKeyId: string | undefined;
  private _secretAccessKey: string | undefined;

  constructor(accessKeyId?: string, secretAccessKey?: string) {
    this._accessKeyId = accessKeyId;
    this._secretAccessKey = secretAccessKey;
  }

  async getCallerIdentity() {
    const credentials = (this._accessKeyId && this._secretAccessKey) ? {
      accessKeyId: this._accessKeyId,
      secretAccessKey: this._secretAccessKey,
    } : undefined;
    const stsClient = new STSClient({ credentials });
    try {
      const callerIdentity = await stsClient.send(new GetCallerIdentityCommand({}));
      return callerIdentity;
    } catch (error: any) {
      if (error.name === 'InvalidClientTokenId' || error.name === 'SignatureDoesNotMatch') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid AWS credentials provided.',
        });
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during credential validation.',
      });
    }
  }

  async createSsmSecureParameter(name: string, value: string) {
    const credentials = (this._accessKeyId && this._secretAccessKey) ? {
      accessKeyId: this._accessKeyId,
      secretAccessKey: this._secretAccessKey,
    } : undefined;
    const ssmClient = new SSMClient({ credentials });
    try {
      await ssmClient.send(new PutParameterCommand({
        Name: name,
        Value: value,
        Type: 'SecureString',
        Overwrite: true,
      }));
    } catch (error) {
      console.error('Error creating SSM secure parameter:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create secure parameter in AWS SSM Parameter Store.',
      });
    }
  }

  async createOrUpdateSecret(name: string, secretString: string, description: string): Promise<string> {
    const credentials = (this._accessKeyId && this._secretAccessKey) ? {
      accessKeyId: this._accessKeyId,
      secretAccessKey: this._secretAccessKey,
    } : undefined;
    const secretsManagerClient = new SecretsManagerClient({ credentials });
    try {
      const response = await secretsManagerClient.send(new CreateSecretCommand({
        Name: name,
        SecretString: secretString,
        Description: description,
      }));
      return response.ARN || '';
    } catch (error) {
      if (error instanceof ResourceExistsException) {
        const response = await secretsManagerClient.send(new UpdateSecretCommand({
          SecretId: name,
          SecretString: secretString,
          Description: description,
        }));
        return response.ARN || '';
      } else {
        console.error('Error creating or updating secret:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create or update secret in AWS Secrets Manager.',
        });
      }
    }
  }

  async sendSqsMessage(queueUrl: string, messageBody: string) {
    const sqsClient = new SQSClient({}); // Uses default credential chain for internal SQS
    try {
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      }));
    } catch (error) {
      console.error('Error sending SQS message:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send message to SQS queue.',
      });
    }
  }
}
