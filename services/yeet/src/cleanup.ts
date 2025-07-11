import { Context } from 'aws-lambda';
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { CodeBuild, CodeBuildClient, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { SSMClient, DeleteParameterCommand } from "@aws-sdk/client-ssm";
import { SecretsManagerClient, DeleteSecretCommand  } from "@aws-sdk/client-secrets-manager";
import { createClient } from '@supabase/supabase-js';

const REGION = process.env.REGION;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL and Key not found.');
}

/**
 * EVENT
 */
enum BuildStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  FAULT = 'FAULT',
  TIMED_OUT = 'TIMED_OUT',
  STOPPED = 'STOPPED',
};

interface CodeBuildStateChangeEvent {
  'detail-type': 'CodeBuild Build State Change';
  detail: {
    'build-status': BuildStatus;
    'project-name': string;
    'build-id': string;
    'additional-information': {
      artifact: {
        location: string;
      },
      logs: {
        'group-name': string;
        'stream-name': string;
        'deep-link': string;
      }
    };
  };
};

export const handler = async (event: CodeBuildStateChangeEvent, context: Context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const buildId = event.detail['build-id'];
  const buildStatus = event.detail['build-status'];
  const projectName = event.detail['project-name'];

  try {
    const codebuild = new CodeBuild({
        region: REGION
    });

    // Get more details about the build
    const getBuildResponse = await codebuild.send(new BatchGetBuildsCommand({
      ids: [buildId]
    }));

    const build = getBuildResponse.builds?.[0];

    if (!build) {
      throw new Error(`Build ${buildId} not found`);
    }

    switch (buildStatus) {
      case BuildStatus.IN_PROGRESS:
        console.log('buildStatus is IN_PROGRESS, skipping...')
        return;
      case BuildStatus.SUCCEEDED:
      case BuildStatus.FAILED:
          console.log('buildStatus is SUCCEEDED or FAILED, continuing...')
          /**
           * Get the context from the DB
           */
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

          const { data, error } = await supabase
            .from('destroys')
            .select(`
              *,
              service:services(*, 
                  environment:environments(*, 
                      provider:providers(*), 
                      user_access_token:user_access_tokens(*)
                  )
              )
            `)
            .eq('destroy_id', buildId)
            .single();

          if (error) {
            throw error;
          }
          console.log('data tree:', data);

          // Use the destroy context directly since it's already a JavaScript object
          const context = data?.destroy_context;

          // Extract GitHub Access Token ARN
          const githubAccessTokenArn = context.metadata.githubAccessTokenArn;
          console.log('GitHub Access Token ARN:', githubAccessTokenArn);

          // Extract Build Environment Variables Resources
          const buildEnvironmentVariables = context.metadata.buildEnvironmentVariables;
          console.log('Build Environment Variables:', buildEnvironmentVariables);

          // Parse the tree
          const service = data?.service;
          const environment = service.environment;
          const user_access_token = environment.user_access_token[0];
          const provider = environment.provider;
          // const application = environment.application;

          /**
           * STS
           */
          const stsClient = new STSClient({ region: environment.region as string });
          const assumeRoleCommand = new AssumeRoleCommand({
              RoleArn: provider?.role_arn as string,
              RoleSessionName: `destroy-env-${environment.id as string}`,
              ExternalId: environment.provider_id as string
          });

          const assumedRole = await stsClient.send(assumeRoleCommand);
          const credentials = assumedRole.Credentials;

          /**
           * Delete Environment Variables from SSM Parameter Store
           */
          try {
            const ssmClient = new SSMClient({
              region: environment?.region as string,
              credentials: {
                accessKeyId: credentials?.AccessKeyId as string,
                secretAccessKey: credentials?.SecretAccessKey as string,
                sessionToken: credentials?.SessionToken as string
              }
            });
      
            // Prepare an array of promises for deleting parameters
            // @ts-expect-error
            const deleteParameterPromises = buildEnvironmentVariables?.map(({ key, resource }) => {
              const deleteParameterCommand = new DeleteParameterCommand({
                Name: resource
              });
      
              console.log("deleting param on customer account: ", resource)
              return ssmClient.send(deleteParameterCommand)
                .then(() => {
                  console.log(`Parameter ${resource} deleted successfully.`);
                })
                .catch(error => console.error(`Failed to delete parameter ${resource}:`, error));
            });
      
            // Step 4: Execute all promises in parallel
            await Promise.all(deleteParameterPromises);
  
          } catch (error) {
            console.error('Error deleting parameter:', error);
          }

          /**
           * Delete the AWS Secret Manager `securestring` and from supabase.vault
           */
          try {
            const secretsManagerClient = new SecretsManagerClient({
              region: environment?.region as string,
              credentials: {
                accessKeyId: credentials?.AccessKeyId as string,
                secretAccessKey: credentials?.SecretAccessKey as string,
                sessionToken: credentials?.SessionToken as string
              }
            });

            const deleteSecretCommand = new DeleteSecretCommand({
              SecretId: `/thunder/env-${environment?.id}`,
              ForceDeleteWithoutRecovery: true
            });
      
            return secretsManagerClient.send(deleteSecretCommand)
            .then(async() => {
              // delete the vault secret
              // await db.$queryRaw`
              //   DELETE FROM vault.secrets
              //   WHERE id = ${user_access_token?.secret_id}::uuid`;
              
              // mark the user access token deleted
              const { error: updateError } = await supabase
                .from('user_access_tokens')
                .update({ deleted_at: new Date() })
                .eq('secret_id', user_access_token?.secret_id);

              if (updateError) {
                throw updateError;
              }
            })
            .catch(error => console.error(`Failed to delete user access token:`, error))
          } catch(error) {
            console.error("Error deleting secret", error)
          }

        break;
      default:
        console.log('No action taken.');
        return;
    }

  } catch (error) {
    console.error('Error processing destroy event:', JSON.stringify(error));
    throw error;
  }
};