import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { TRPCError } from '@trpc/server';

export class AwsLibrary {
  private stsClient: STSClient;
  private ssmClient: SSMClient;

  constructor(accessKeyId: string, secretAccessKey: string) {
    this.stsClient = new STSClient({
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    this.ssmClient = new SSMClient({
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  async getCallerIdentity() {
    try {
      const callerIdentity = await this.stsClient.send(new GetCallerIdentityCommand({}));
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
    try {
      await this.ssmClient.send(new PutParameterCommand({
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
}
