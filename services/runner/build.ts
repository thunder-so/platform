import type { SQSHandler } from 'aws-lambda';
import { CodeBuild, StartBuildCommand, BatchGetBuildsCommand, ArtifactsType, EnvironmentVariableType } from '@aws-sdk/client-codebuild';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { createClient } from '@supabase/supabase-js';
import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import { spaBuilder, lambdaBuilder, ecsBuilder } from './builders';
import type { IStackBuilder, RunnerRequest } from './builders/types';

/**
 * Gather the environment
 */
const REGION = process.env.REGION;
const RUNNER_BUCKET = process.env.RUNNER_BUCKET;
const RUNNER_BUILD = process.env.RUNNER_BUILD;
const EVENT_TARGET = process.env.EVENT_TARGET;

if (!RUNNER_BUCKET) {
  throw new Error('Environment variable RUNNER_BUCKET is not set');
}

if (!RUNNER_BUILD) {
  throw new Error('Environment variable RUNNER_BUILD is not set');
}

if (!EVENT_TARGET) {
  throw new Error('Environment variable EVENT_TARGET is not set');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL and Key not found.');
}

const builders: Record<string, IStackBuilder> = {
  SPA: spaBuilder,
  FUNCTION: lambdaBuilder,
  WEB_SERVICE: ecsBuilder,
};

export const handler: SQSHandler = async (event) => {
  const record = event.Records[0];
  console.log('Received SQS message:', record);

  const { messageAttributes } = record;
  const command = messageAttributes.command?.stringValue;
  const stackType = messageAttributes.stackType?.stringValue;
  const stackVersion = messageAttributes.stackVersion?.stringValue;
  const eventId = messageAttributes.eventId?.stringValue;
  const accessTokenSecretArn = messageAttributes.accessTokenSecretArn?.stringValue;
  const provider = JSON.parse(messageAttributes.provider?.stringValue || '{}');
  const props: RunnerRequest = JSON.parse(record.body);

  if (!stackType || !stackVersion || !eventId || !accessTokenSecretArn || !provider) {
    console.error('Missing required message attributes');
    throw new Error('Missing required message attributes');
  }

  const builder = builders[stackType];
  if (!builder) {
    throw new Error(`No builder found for stack type: ${stackType}`);
  }

  // running the build on customer account
  let credentials;

  // Provider role ARN is provided
  // If the roleArn is provided, we assume that role to get the credentials
  if (provider.role_arn) {
    const assumeRoleParams = {
      RoleArn: provider.role_arn,
      RoleSessionName: 'RunnerBuildSession',
      ExternalId: provider.organization_id,
    };

    const sts = new STSClient({ region: REGION });
    const assumedRole = await sts.send(new AssumeRoleCommand(assumeRoleParams));
    credentials = assumedRole.Credentials;
  } 
  // If the roleArn is not provided, we use the accessKeyId and secretAccessKey from SSM
  else {
    const parametersProvider = new SSMProvider();
    let secretAccessKey;
    if (provider.access_key_id) {
      const parameterPath = `/thunder/${provider.organization_id}/${provider.access_key_id}/secretAccessKey`;
      console.log(`Attempting to retrieve SSM parameter: ${parameterPath} for accessKeyId: ${provider.access_key_id}`);
      try {
        secretAccessKey = await parametersProvider.get(parameterPath, { decrypt: true });
        console.log(`Successfully retrieved SSM parameter: ${parameterPath}`);
      } catch (ssmError) {
        console.error(`Failed to retrieve SSM parameter ${parameterPath}:`, ssmError);
        throw ssmError; // Re-throw the error after logging
      }
    }
    credentials = {
      AccessKeyId: provider.access_key_id,
      SecretAccessKey: secretAccessKey,
    }
  } 


  // Initiate codebuild in our account
  const codebuild = new CodeBuild({ region: REGION });

  const buildSpec = command === 'delete' 
    ? builder.generateDestroyBuildSpec({ ...props, stackVersion, accessTokenSecretArn })
    : builder.generateBuildSpec({ ...props, stackVersion, accessTokenSecretArn });
  const cdkContext = builder.generateCdkContext(props);

  const params = {
    projectName: process.env.RUNNER_BUILD,
    artifactsOverride: {
      type: ArtifactsType.S3,
      location: process.env.RUNNER_BUCKET,
      path: props.service,
    },
    buildspecOverride: buildSpec,
    environmentVariablesOverride: [
      { name: 'AWS_ACCOUNT', value: provider.account_id, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_REGION', value: provider.region, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_ACCESS_KEY_ID', value: credentials?.AccessKeyId, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_SECRET_ACCESS_KEY', value: credentials?.SecretAccessKey, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_SESSION_TOKEN', value: credentials?.SessionToken, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'CDK_CONTEXT', value: JSON.stringify(cdkContext), type: EnvironmentVariableType.PLAINTEXT },
    ].filter(({ value }) => value !== undefined && value !== null),
  };

  try {
    const response = await codebuild.startBuild(params);

    const buildArn = response.build?.arn;
    const buildId = response.build?.id as string;

    if (buildId) {
      console.log(`Build started with ARN: ${buildArn}`);
      console.log(`Build started with ID: ${buildId}`);

      const buildDetails = await codebuild.send(new BatchGetBuildsCommand({ ids: [buildId] }));
      if (buildDetails.builds && buildDetails.builds.length > 0) {
        const build = buildDetails.builds[0];

        const startTime = build.startTime;

        // Store the event in Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        if (command === 'delete') {
          // Update Supabase DB
          const { data, error } = await supabase
            .from('destroys')
            .update({
              destroy_id: buildArn, // using ARN because CodeBuildStateChangeEvent detail['build-id'] uses ARN
              updated_at: new Date().toISOString(),
            })
            .eq('id', eventId);

          if (error) {
            throw error;
          }
        } else {
          // Update Supabase DB
          const { data, error } = await supabase
            .from('builds')
            .update({
              build_id: buildArn, // using ARN because CodeBuildStateChangeEvent detail['build-id'] uses ARN
              build_start: startTime?.toISOString(),
              build_context: cdkContext,
              updated_at: new Date().toISOString(),
            })
            .eq('id', eventId);

          if (error) {
            throw error;
          }
        }
      }
    }
  } catch (error) {
    console.error('Runner failed', JSON.stringify(error));
    throw error;
  }
};
