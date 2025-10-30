import { STSClient, GetCallerIdentityCommand, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { CodePipelineClient, StartPipelineExecutionCommand } from '@aws-sdk/client-codepipeline';
import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { CloudWatchLogsClient, GetLogEventsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { Route53Client, ListHostedZonesCommand } from '@aws-sdk/client-route-53';
import { ACMClient, ListCertificatesCommand } from '@aws-sdk/client-acm';
import dns from 'dns/promises';
import { TRPCError } from '@trpc/server';
import { db } from '~/server/db/db';
import { providers, services } from '../db/schema';
import { type ProviderSchema } from '~/server/validators/common';
import { sql, eq } from 'drizzle-orm';

// A type for the initial validation scenario where the secret is not yet in the vault
type ManualProvider = ProviderSchema & { secret_access_key: string };

async function getCredentials(provider: ProviderSchema | ManualProvider) {
    // Scenario 1: Role-based provider
    if (provider.role_arn) {
        const stsClient = new STSClient({});
        const assumedRole = await stsClient.send(new AssumeRoleCommand({
            RoleArn: provider.role_arn,
            RoleSessionName: `thunder-session-${Date.now()}`,
            ExternalId: provider.organization_id || undefined
        }));

        const c = assumedRole.Credentials;
        if (!c || !c.AccessKeyId || !c.SecretAccessKey) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to assume role or received invalid temporary credentials.',
            });
        }

        return {
            accessKeyId: c.AccessKeyId,
            secretAccessKey: c.SecretAccessKey,
            sessionToken: c.SessionToken,
            expiration: c.Expiration ? new Date(c.Expiration) : undefined,
        };
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
    provider: ProviderSchema | ManualProvider,
    region?: string
): Promise<TClient> {
    const credentials = await getCredentials(provider);
    return new clientConstructor({ credentials, region });
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

// export async function createSsmSecureParameter(provider: ManualProvider, name: string, value: string) {
//     try {
//         const ssmClient = await getAwsClient(SSMClient, provider);
//         await ssmClient.send(new PutParameterCommand({
//             Name: name,
//             Value: value,
//             Type: 'SecureString',
//             Overwrite: true,
//         }));
//     } catch (error) {
//         console.error('Error creating SSM secure parameter:', error);
//         throw new TRPCError({
//             code: 'INTERNAL_SERVER_ERROR',
//             message: 'Failed to create secure parameter in AWS SSM Parameter Store.',
//         });
//     }
// }

export async function createOrUpdateSecret(provider: ProviderSchema, name: string, secretString: string, description: string, region?: string): Promise<string> {
    const secretsManagerClient = await getAwsClient(SecretsManagerClient, provider, region);
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

export async function triggerPipeline(providerId: string, serviceId: string, sha?: string, region?: string) {
  const provider = await db.query.providers.findFirst({
    where: eq(providers.id, providerId),
  });

  const codePipelineClient = await getAwsClient(CodePipelineClient, provider as ProviderSchema, region);

  const serviceData = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
  });
  // @ts-expect-error
  const pipelineName = serviceData?.resources?.CodePipelineName;

  if (!pipelineName) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Pipeline name not found for this service.',
    });
  }

  try {
    const command = new StartPipelineExecutionCommand({
      name: pipelineName,
      ...(sha && {
        sourceRevisions: [
          {
            actionName: 'GithubSourceAction',
            revisionType: 'COMMIT_ID',
            revisionValue: sha
          }
        ]
      })
    });
    const response = await codePipelineClient.send(command);

    console.log('Pipeline triggered successfully:', response.pipelineExecutionId);
    return response.pipelineExecutionId;
  } catch (error) {
    console.error('Error triggering pipeline:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to trigger pipeline.',
    });
  }
}

export async function getCloudWatchLogs(provider: ProviderSchema, logGroupName: string, logStreamName: string, nextToken?: string, region?: string) {
    const cloudWatchLogsClient = await getAwsClient(CloudWatchLogsClient, provider, region);

    try {
        const command = new GetLogEventsCommand({
            logGroupName: logGroupName,
            logStreamName: logStreamName,
            startFromHead: true,
            nextToken: nextToken,
        });
        const response = await cloudWatchLogsClient.send(command);
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

export async function getCloudWatchLogsFromGroup(provider: ProviderSchema, logGroupName: string, nextToken?: string, startTime?: number, endTime?: number, region?: string) {
    const cloudWatchLogsClient = await getAwsClient(CloudWatchLogsClient, provider, region);

    try {
        const command = new FilterLogEventsCommand({
            logGroupName: logGroupName,
            // prefer explicit start/end when provided, otherwise fall back to last 1 hour
            startTime: typeof startTime === 'number' ? startTime : Date.now() - 1000 * 60 * 60,
            ...(typeof endTime === 'number' ? { endTime } : {}),
            nextToken: nextToken,
        });
        const response = await cloudWatchLogsClient.send(command);
        return {
            events: response.events || [],
            nextForwardToken: response.nextToken,
        };
    } catch (error) {
        console.error('Error fetching logs from CloudWatch log group:', error);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch logs from CloudWatch log group.',
        });
    }
}

// Lookup hosted zone ID and ACM certificates for a domain using the provider credentials
export async function lookupHostedZoneAndCerts(provider: ProviderSchema | ManualProvider, domain: string) {
    try {
        const route53 = await getAwsClient(Route53Client, provider);
        const acm = await getAwsClient(ACMClient, provider);

        // Find hosted zone by listing zones and matching suffix
        const hzResp = await route53.send(new ListHostedZonesCommand({}));
        const hostedZones = hzResp.HostedZones || [];
        const matched = hostedZones.find(z => {
            const name = (z.Name || '').replace(/\.$/, '');
            return domain === name || domain.endsWith(`.${name}`);
        });
        const hosted_zone_id = matched?.Id ? matched.Id.split('/').pop() : undefined;

        // List ACM certificates and try to match by domain name
        const certsResp = await acm.send(new ListCertificatesCommand({}));
        const certs = (certsResp.CertificateSummaryList || []).filter(c => {
            const certDomain = c.DomainName || '';
            return certDomain === domain || certDomain.endsWith(domain) || domain.endsWith(certDomain);
        }).map(c => ({ arn: c.CertificateArn, domain: c.DomainName }));

        return { hosted_zone_id, certificates: certs };
    } catch (error) {
        console.error('Error in lookupHostedZoneAndCerts:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to lookup hosted zone or certificates.' });
    }
}

// Verify DNS records for a domain. Tries CNAME then TXT if expected values provided
export async function verifyDomainDns(domain: string, expectedCname?: string, expectedTxt?: string) {
    try {
        if (expectedCname) {
            const cnames = await dns.resolveCname(domain).catch(() => []);
            if (cnames && cnames.includes(expectedCname)) return { verified: true, method: 'CNAME', records: cnames };
        }

        if (expectedTxt) {
            const txts = await dns.resolveTxt(domain).catch(() => []);
            // resolveTxt returns string[][]
            const flat = txts.flat().map(s => s.toString());
            if (flat.includes(expectedTxt)) return { verified: true, method: 'TXT', records: flat };
        }

        return { verified: false };
    } catch (error) {
        console.error('Error verifying domain DNS:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to verify domain DNS.' });
    }
}