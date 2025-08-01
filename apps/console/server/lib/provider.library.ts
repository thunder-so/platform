import { STSClient, GetCallerIdentityCommand, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { type Provider } from '~/server/db/schema';
import { sql } from 'drizzle-orm';

// A type for the initial validation scenario where the secret is not yet in the vault
type ManualProvider = Provider & { secret_access_key: string };

async function getCredentials(provider: Provider | ManualProvider) {
    // Scenario 1: Role-based provider
    if (provider.role_arn) {
        const stsClient = new STSClient({});
        const assumedRole = await stsClient.send(new AssumeRoleCommand({
            RoleArn: provider.role_arn,
            RoleSessionName: `thunder-session-${Date.now()}`,
            ExternalId: provider.organization_id || undefined
        }));
        return assumedRole.Credentials;
    }

    // Scenario 2: Key-based provider where the secret is in the vault
    if (provider.access_key_id && provider.secret_id) {
        const tokenResult = await db.execute(sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${provider.secret_id}::uuid`);
        const secret_access_key = tokenResult.rows[0]?.decrypted_secret as string | undefined;

        if (!secret_access_key) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to decrypt provider secret from vault.',
            });
        }
        return {
            accessKeyId: provider.access_key_id,
            secretAccessKey: secret_access_key,
        };
    }

    // Scenario 3: Manual key-based provider for initial validation (secret is passed directly)
    if (provider.access_key_id && 'secret_access_key' in provider && provider.secret_access_key) {
         return {
            accessKeyId: provider.access_key_id,
            secretAccessKey: provider.secret_access_key,
        };
    }

    throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Provider does not have valid credentials configured.',
    });
}

async function getAwsClient<TClient>(
    clientConstructor: new (config: any) => TClient,
    provider: Provider | ManualProvider
): Promise<TClient> {
    const credentials = await getCredentials(provider);
    return new clientConstructor({ credentials });
}

export async function getCallerIdentity(provider: ManualProvider) {
    try {
        const stsClient = await getAwsClient(STSClient, provider);
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

export async function createSsmSecureParameter(provider: ManualProvider, name: string, value: string) {
    try {
        const ssmClient = await getAwsClient(SSMClient, provider);
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

export async function createOrUpdateSecret(provider: Provider, name: string, secretString: string, description: string): Promise<string> {
    const secretsManagerClient = await getAwsClient(SecretsManagerClient, provider);
    try {
        const response = await secretsManagerClient.send(new CreateSecretCommand({
            Name: name,
            SecretString: secretString,
            Description: description,
        }));
        return response.ARN || '';
    } catch (error: any) {
        if (error.constructor.name === 'ResourceExistsException') {
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