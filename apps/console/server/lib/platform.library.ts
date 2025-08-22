import { SQSClient, SendMessageCommand, MessageAttributeValue } from '@aws-sdk/client-sqs';
import { TRPCError } from '@trpc/server';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';

export class PlatformLibrary {

  /**
   * Send Create New Application SQS message
   * @param queueUrl 
   * @param messageBody 
   * @param messageGroupId 
   */
  async sendSqsMessage(queueUrl: string, messageBody: string, messageGroupId: string, messageAttributes?: Record<string, MessageAttributeValue>): Promise<void> {
    try {
      const sqsClient = new SQSClient({});

      await sqsClient.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageGroupId, // Using messageGroupId for deduplication
        MessageAttributes: messageAttributes,
      }));
    } catch (error) {
      console.error('Error sending SQS message:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send message to SQS queue.',
      });
    }
  }

  /**
   * Create or update a secure SSM parameter
   * @param name 
   * @param value
   */
  async createSsmSecureParameter(name: string, value: string): Promise<void> {
    try {
        const ssmClient = new SSMClient({});
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
}
