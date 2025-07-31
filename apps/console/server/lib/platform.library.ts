import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { TRPCError } from '@trpc/server';

export class PlatformLibrary {

  constructor() {
    // No credentials needed for platform-level operations
  }

  async sendSqsMessage(queueUrl: string, messageBody: string, messageGroupId: string) {
    try {
      const sqsClient = new SQSClient({});

      await sqsClient.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageGroupId, // Using messageGroupId for deduplication
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
