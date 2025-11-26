import path from 'path';
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
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Supabase URL, Key, and Service Key not found.');
}

const builders: Record<string, IStackBuilder> = {
  SPA: spaBuilder,
  FUNCTION: lambdaBuilder,
  WEB_SERVICE: ecsBuilder,
};

export const handler: SQSHandler = async (event) => {
  console.log('Received SQS event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      console.log('Processing SQS record:', record);

      const { messageAttributes, body } = record;
      const command = messageAttributes.command?.stringValue || 'build'; // [install, build, delete]
      const stackType = messageAttributes.stackType?.stringValue;
      const stackVersion = messageAttributes.stackVersion?.stringValue;
      const eventId = messageAttributes.eventId?.stringValue;
      const accessTokenSecretArn = messageAttributes.accessTokenSecretArn?.stringValue;
      
      let provider;
      try {
        provider = JSON.parse(messageAttributes.provider?.stringValue || '{}');
      } catch (parseError) {
        console.error('Failed to parse provider JSON:', parseError);
        throw new Error(`Invalid provider JSON: ${parseError}`);
      }
      
      let props: RunnerRequest;
      try {
        props = JSON.parse(body);
      } catch (parseError) {
        console.error('Failed to parse message body:', parseError);
        throw new Error(`Invalid message body JSON: ${parseError}`);
      }

      console.log('Message attributes parsed successfully:', { command, stackType, stackVersion, eventId, provider });

      if (!stackType || !stackVersion || !eventId || !accessTokenSecretArn || !provider) {
        console.error('Missing required message attributes');
        throw new Error('Missing required message attributes');
      }

      const builder = builders[stackType];
      if (!builder) {
        throw new Error(`No builder found for stack type: ${stackType}`);
      }
      console.log('Stack type:', stackType);

      let credentials;
      if (provider.role_arn) {
        console.log('Assuming role:', provider.role_arn);
        const assumeRoleParams = {
          RoleArn: provider.role_arn,
          RoleSessionName: 'RunnerBuildSession',
          ExternalId: provider.organization_id,
        };

        const sts = new STSClient({ region: REGION });
        const assumedRole = await sts.send(new AssumeRoleCommand(assumeRoleParams));
        credentials = assumedRole.Credentials;
        console.log('Successfully assumed role');
      } else {
        console.log('Using access key from SSM');
        const parametersProvider = new SSMProvider();
        let secretAccessKey;
        if (provider.access_key_id) {
          const parameterPath = `/thunder/${provider.organization_id}/${provider.access_key_id}/secretAccessKey`;
          console.log(`Attempting to retrieve SSM parameter: ${parameterPath}`);
          try {
            secretAccessKey = await parametersProvider.get(parameterPath, { decrypt: true });
            console.log(`Successfully retrieved SSM parameter: ${parameterPath}`);
          } catch (ssmError) {
            console.error(`Failed to retrieve SSM parameter ${parameterPath}:`, ssmError);
            throw ssmError;
          }
        }
        credentials = {
          AccessKeyId: provider.access_key_id,
          SecretAccessKey: secretAccessKey,
        };
        console.log('Successfully retrieved credentials from SSM');
      }

      const codebuild = new CodeBuild({ region: REGION });

      const cdkContext = {
        ...props,
        metadata: { 
          ...props.metadata, 
          accessTokenSecretArn,
          eventTarget: EVENT_TARGET,
        }
      }
      console.log('CDK Context:', JSON.stringify(cdkContext, null, 2));

      const buildSpec = command === 'delete'
        ? builder.generateDestroyBuildSpec(cdkContext, stackVersion)
        : builder.generateBuildSpec(cdkContext, stackVersion);

      const params = {
        projectName: process.env.RUNNER_BUILD,
        artifactsOverride: {
          type: ArtifactsType.S3,
          location: process.env.RUNNER_BUCKET,
          path: props.metadata.service,
        },
        buildspecOverride: buildSpec,
        environmentVariablesOverride: [
          { name: 'AWS_ACCOUNT', value: provider.account_id, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_REGION', value: provider.region, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_ACCESS_KEY_ID', value: credentials?.AccessKeyId, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_SECRET_ACCESS_KEY', value: credentials?.SecretAccessKey, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_SESSION_TOKEN', value: credentials?.SessionToken, type: EnvironmentVariableType.PLAINTEXT },
        ].filter(({ value }) => value !== undefined && value !== null),
      };

      console.log('Starting CodeBuild project with params:', JSON.stringify(params, null, 2));
      const response = await codebuild.startBuild(params);
      console.log('CodeBuild project started successfully:', response);

      const buildArn = response.build?.arn;
      const buildId = response.build?.id as string;

      if (buildId) {
        console.log(`Build started with ARN: ${buildArn}`);
        console.log(`Build started with ID: ${buildId}`);

        const buildDetails = await codebuild.send(new BatchGetBuildsCommand({ ids: [buildId] }));
        if (buildDetails.builds && buildDetails.builds.length > 0) {
          const build = buildDetails.builds[0];
          console.log('Fetched build details:', JSON.stringify(build, null, 2));
          const startTime = build.startTime;
          const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

          if (command === 'delete') {
            console.log('Updating Supabase for delete command');
            const { data, error } = await supabase
              .from('destroys')
              .update({
                destroy_id: buildArn,
                updated_at: new Date().toISOString(),
              })
              .eq('id', eventId);
            if (error) throw error;
            console.log('Supabase update for delete successful');
          } else {
            console.log('Updating Supabase for build command');
            const { data, error } = await supabase
              .from('builds')
              .update({
                build_id: buildArn,
                build_start: startTime?.toISOString(),
                build_context: cdkContext,
                updated_at: new Date().toISOString(),
              })
              .eq('id', eventId);
            if (error) throw error;
            console.log('Supabase update for build successful');
          }
        }
      }
    } catch (error) {
      console.error('Runner failed for record:', record);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // throw error; // Re-throw to trigger SQS retry mechanism
    }
  }
};
