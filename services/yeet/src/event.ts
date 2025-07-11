import type { SQSHandler } from "aws-lambda";
import { CodeBuild, CodeBuildClient, StartBuildCommand, type EnvironmentVariable, EnvironmentVariableType, ArtifactsType, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { createClient } from '@supabase/supabase-js';

/**
 * Gather the environment
 */
const REGION = process.env.REGION;
const YEET_BUCKET = process.env.YEET_BUCKET;
const YEET_BUILD = process.env.YEET_BUILD;

if (!YEET_BUCKET) {
  throw new Error("Environment variable YEET_BUCKET is not set");
}

if (!YEET_BUILD) {
  throw new Error("Environment variable YEET_BUILD is not set");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL and Key not found.');
}

export const handler: SQSHandler = async (event) => {
  const record = event.Records[0];
  const recordBody = JSON.parse(record.body);
  console.log('Parsed Record Body:', recordBody);

  // Gather the MessageAttributes
  const serviceId = record.messageAttributes?.serviceId?.stringValue;
  const environmentId = record.messageAttributes?.environmentId?.stringValue;
  const providerId = record.messageAttributes?.providerId?.stringValue;
  const providerArn = record.messageAttributes?.providerArn?.stringValue;
  const serviceStackVersion = record.messageAttributes?.serviceStackVersion?.stringValue;

  if (!providerId || !providerArn) {
    throw new Error('Provider data not found.');
  }

  // configure the metadata object
  const metadata = {
    "metadata": recordBody
  };

  // running the build on customer account
  const assumeRoleParams = {
    RoleArn: providerArn,
    RoleSessionName: "YeetBuildSession",
    ExternalId: providerId
  };

  const sts = new STSClient({ region: REGION });
  const assumedRole = await sts.send(new AssumeRoleCommand(assumeRoleParams));
  const credentialedArn = assumedRole.AssumedRoleUser?.Arn;
  const credentials = assumedRole.Credentials;

  // Initiate codebuild in our account
  const codebuild = new CodeBuild({ region: REGION });

  const buildSpec = `
  version: 0.2
  phases:
    install:
      runtime-versions:
        nodejs: 20
      commands:
        - npm install -g aws-cdk
        - git clone --depth 1 --branch v${serviceStackVersion} https://github.com/thunder-so/cdk-spa.git .
        - npm install tsx aws-cdk-lib@2.150.0 
        - echo '${JSON.stringify(metadata)}' > cdk.context.json
        - npx cdk destroy --app "npx tsx bin/app.ts" --verbose --force
  `;

  const params = {
    projectName: process.env.YEET_BUILD,
    artifactsOverride: {
        type: ArtifactsType.S3,
        location: process.env.YEET_BUCKET,
        path: recordBody.service
    },
    buildspecOverride: buildSpec,
    environmentVariablesOverride: [
      { name: 'AWS_ACCOUNT', value: recordBody.env.account, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_REGION', value: recordBody.env.region, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_ACCESS_KEY_ID', value: credentials?.AccessKeyId, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_SECRET_ACCESS_KEY', value: credentials?.SecretAccessKey, type: EnvironmentVariableType.PLAINTEXT },
      { name: 'AWS_SESSION_TOKEN', value: credentials?.SessionToken, type: EnvironmentVariableType.PLAINTEXT }
    ]
  };

  try {
    const response = await codebuild.startBuild(params);

    const buildArn = response.build?.arn;
    const buildId = response.build?.id as string;

    if (buildId) {
      console.log(`Build started with ARN: ${buildArn}`);
      console.log(`Build started with ID: ${buildId}`);

      // Store the event in Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Create destroys row in Supabase DB
      const { data, error } = await supabase
      .from('destroys')
      .insert({
          destroy_id: buildArn, // using ARN because CodeBuildStateChangeEvent detail['build-id'] uses ARN
          destroy_context: metadata,
          service_id: serviceId,
          environment_id: environmentId
      })
      // .select();

      if (error) {
          throw error;
      }
    }    

  } catch (error) {
    console.error('Yeet failed', JSON.stringify(error));
    throw error;
  }
};