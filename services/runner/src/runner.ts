// import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import type { SQSHandler } from "aws-lambda";
import { CodeBuild, CodeBuildClient, StartBuildCommand, type EnvironmentVariable, EnvironmentVariableType, ArtifactsType, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { createClient } from '@supabase/supabase-js';

/**
 * Gather the environment
 */
const REGION = process.env.REGION;
const RUNNER_BUCKET = process.env.RUNNER_BUCKET;
const RUNNER_BUILD = process.env.RUNNER_BUILD;
const EVENT_TARGET = process.env.EVENT_TARGET;

if (!RUNNER_BUCKET) {
  throw new Error("Environment variable RUNNER_BUCKET is not set");
}

if (!RUNNER_BUILD) {
  throw new Error("Environment variable RUNNER_BUILD is not set");
}

if (!EVENT_TARGET) {
  throw new Error("Environment variable EVENT_TARGET is not set");
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
  const eventId = record.messageAttributes?.event_id?.stringValue;
  const providerId = record.messageAttributes?.providerId?.stringValue;
  const providerArn = record.messageAttributes?.providerArn?.stringValue;
  const serviceStackType = record.messageAttributes?.serviceStackType?.stringValue;
  const serviceStackVersion = record.messageAttributes?.serviceStackVersion?.stringValue;

  if (!providerId || !providerArn) {
    throw new Error('Provider data not found.');
  }

  // configure the metadata object
  const metadata = {
    "metadata": recordBody
  };

  metadata.metadata.eventTarget = EVENT_TARGET;

  // running the build on customer account
  const assumeRoleParams = {
    RoleArn: providerArn,
    RoleSessionName: "RunnerBuildSession",
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
        - git clone --depth 1 --branch v${serviceStackVersion} https://github.com/thunder-so/cdk-spa.git .
        - npm install tsx aws-cdk@2.150.0 aws-cdk-lib@2.150.0 
        - echo '${JSON.stringify(metadata)}' > cdk.context.json
        - npx cdk bootstrap aws://${recordBody.env.account}/${recordBody.env.region}
        - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
  `;

  const params = {
    projectName: process.env.RUNNER_BUILD,
    artifactsOverride: {
        type: ArtifactsType.S3,
        location: process.env.RUNNER_BUCKET,
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
      
      const buildDetails = await codebuild.send( new BatchGetBuildsCommand({ ids: [buildId] }) );
      if (buildDetails.builds && buildDetails.builds.length > 0) {
        const build = buildDetails.builds[0];

        const startTime = build.startTime;
        // const logStreamName = build.logs?.streamName;
        // console.log("build.logs", JSON.stringify(build.logs));

        // Store the event in Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Update Supabase DB
        const { data, error } = await supabase
        .from('builds')
        .update({
            build_id: buildArn, // using ARN because CodeBuildStateChangeEvent detail['build-id'] uses ARN
            build_start: startTime?.toISOString(),
            build_context: metadata,
            // build_log: logStreamName || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        // .select();

        if (error) {
            throw error;
        }
      }
    }    

  } catch (error) {
    console.error('Runner failed', JSON.stringify(error));
    throw error;
  }
};
