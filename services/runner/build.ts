import type { SQSHandler } from 'aws-lambda';
import { CodeBuild, StartBuildCommand, BatchGetBuildsCommand, ArtifactsType, EnvironmentVariableType } from '@aws-sdk/client-codebuild';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { createClient } from '@supabase/supabase-js';
import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import type { StaticProps, LambdaProps, FargateProps } from '@thunder-so/thunder';

type StackType = 'STATIC' | 'LAMBDA' | 'FARGATE';

// Base runner request structure
interface RunnerRequestBase {
  metadata: {
    application: string;
    environment: string;
    service: string;
    rootDir: string;
    stackVersion?: string;
    accessTokenSecretArn?: string;
    eventTarget?: string;
    env?: {
      account: string;
      region: string;
    };
    [key: string]: any;
  };
}

// Stack-specific runner requests using Thunder library types
type StaticRunnerRequest = RunnerRequestBase & { 
  metadata: RunnerRequestBase['metadata'] & Omit<StaticProps, 'env'> 
};

type LambdaRunnerRequest = RunnerRequestBase & { 
  metadata: RunnerRequestBase['metadata'] & Omit<LambdaProps, 'env'> 
};

type FargateRunnerRequest = RunnerRequestBase & { 
  metadata: RunnerRequestBase['metadata'] & Omit<FargateProps, 'env'> 
};

type RunnerRequest = StaticRunnerRequest | LambdaRunnerRequest | FargateRunnerRequest;

// Sanitize paths to ensure valid unix directory paths, trim leading/trailing slashes
const sanitizePath = (path: string | undefined): string => {
  if (!path) return '';
  return path.replace(/[^a-zA-Z0-9._\-@#$%^&*+=~ /]|\/+/g, m => m.includes('/') ? '/' : '').replace(/^\/+|\/+$/g, '');
};

const THUNDER_REPO_URL = 'https://github.com/thunder-so/thunder.git';

function generateBuildSpec(
  stackType: StackType,
  command: 'build' | 'delete',
  context: any,
  stackVersion: string
): string {
  const buildProps = context.metadata.buildProps;
  const sourceProps = context.metadata.sourceProps;
  const rootDir = sanitizePath(context.metadata.rootDir);
  const isLambdaContainer = stackType === 'LAMBDA' && !!context.metadata.functionProps?.dockerFile;
  const needsUserBuild = stackType === 'STATIC' || (stackType === 'LAMBDA' && !isLambdaContainer);
  const needsCustomRuntime = stackType === 'STATIC' || (stackType === 'LAMBDA' && !isLambdaContainer);
  const needsDockerEnv = stackType === 'FARGATE';
  const binFile = stackType.toLowerCase(); // static.ts, lambda.ts, fargate.ts

  // Adjust context based on stack type
  const adjustedBuildProps = needsCustomRuntime
    ? {
        ...context.metadata.buildProps,
        customRuntime: 'runtime/Dockerfile'
      }
    : context.metadata.buildProps;

  const adjustedContext = {
    ...context,
    metadata: {
      ...context.metadata,
      contextDirectory: '../code/',
      buildProps: adjustedBuildProps
    }
  };

  // Build install commands
  let installCommands = '';
  
  if (command === 'build') {
    installCommands = `- echo "Starting build..."
            - source ~/.bashrc
            - export PROJECT_PATH="$PWD"`;
    
    if (needsDockerEnv) {
      installCommands += `
            - export DOCKER_BUILDKIT=1
            - export DOCKER_CLI_EXPERIMENTAL=enabled`;
    }
    
    installCommands += `
            - echo "Building application..."
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --region ${context.metadata.env.region} --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner}/${sourceProps?.repo}.git code`;

    if (needsUserBuild) {
      installCommands += `
            - cd "code/${rootDir}"
            - fnm use ${buildProps?.runtime_version || '24'}
            - echo "Installing dependencies..."
            - ${buildProps?.installcmd || 'npm install'}
            - echo "Install phase complete"
            - echo "Building application..."
            - ${buildProps?.buildcmd || 'npm run build'}
            - echo "Build phase complete"`;
    }
  } else {
    // Delete command
    installCommands = `- echo "Starting destroy..."
            - source ~/.bashrc
            - export PROJECT_PATH="$PWD"`;
    
    if (needsDockerEnv) {
      installCommands += `
            - export DOCKER_BUILDKIT=1
            - export DOCKER_CLI_EXPERIMENTAL=enabled`;
    }
    
    installCommands += `
            - echo "Cloning repository for destroy..."
            - curl -fsSL https://raw.githubusercontent.com/go-to-k/delstack/main/install.sh | sh
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --region ${context.metadata.env.region} --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner}/${sourceProps?.repo}.git code`;

    if (needsUserBuild) {
      installCommands += `
            - cd "code/${rootDir}"
            - fnm use ${buildProps?.runtime_version || '24'}
            - echo "Installing dependencies..."
            - ${buildProps?.installcmd || 'npm install'}
            - echo "Install phase complete"
            - echo "Building application..."
            - ${buildProps?.buildcmd || 'npm run build'}
            - echo "Build phase complete"`;
    }
  }

  const stackName = `${context.metadata.application.substring(0, 7)}-${context.metadata.service.substring(0, 7)}-${context.metadata.environment.substring(0, 7)}`.substring(0, 23).toLowerCase();

  const cdkCommand = command === 'delete'
    ? `delstack -s ${stackName} -f`
    : 'npx cdk deploy --app "npx tsx bin/' + binFile + '.ts" --require-approval never';

  let postBuildCommands = `- echo "${command === 'delete' ? 'Destroying' : 'Deploying'} infrastructure..."`;
  
  
  postBuildCommands += `
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - ${cdkCommand}`;

  return `
      version: 0.2
      phases:
        install:
          commands:
            ${installCommands}
        build:
          commands:
            - echo "Installing CDK dependencies..."
            - cd "$PROJECT_PATH"
            - git clone --depth 1 --branch v${stackVersion} -c advice.detachedHead=false ${THUNDER_REPO_URL} lib
            - cd "lib"
            - bun install
        post_build:
          commands:
            ${postBuildCommands}
    `;
}

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

      if (!['STATIC', 'LAMBDA', 'FARGATE'].includes(stackType)) {
        throw new Error(`Invalid stack type: ${stackType}. Must be STATIC, LAMBDA, or FARGATE`);
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

      const buildSpec = generateBuildSpec(
        stackType as StackType,
        command === 'delete' ? 'delete' : 'build',
        cdkContext,
        stackVersion
      );

      const params = {
        projectName: process.env.RUNNER_BUILD,
        artifactsOverride: {
          type: ArtifactsType.S3,
          location: process.env.RUNNER_BUCKET,
          path: props.metadata.service,
        },
        buildspecOverride: buildSpec,
        environmentVariablesOverride: [
          { name: 'COMMAND', value: command, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_ACCOUNT', value: provider.account_id, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_REGION', value: provider.region, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_ACCESS_KEY_ID', value: credentials?.AccessKeyId, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_SECRET_ACCESS_KEY', value: credentials?.SecretAccessKey, type: EnvironmentVariableType.PLAINTEXT },
          { name: 'AWS_SESSION_TOKEN', value: credentials?.SessionToken, type: EnvironmentVariableType.PLAINTEXT },
        ].filter(({ value }) => value !== undefined && value !== null),
      };

      console.log('Starting CodeBuild project with params:', JSON.stringify(params, null, 2));
      
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

      if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
        throw new Error('Supabase URL and Key not found.');
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

      let response;
      try {
        response = await codebuild.startBuild(params);
        console.log('CodeBuild project started successfully:', response);
      } catch (buildStartError) {
        console.error('CodeBuild startBuild failed:', buildStartError);
        
        const errorMsg = buildStartError instanceof Error ? buildStartError.message : String(buildStartError);
        const buildLog = {
          errorCode: 'BUILD_START_FAILED',
          errorMessage: errorMsg,
        };

        console.log('Updating Supabase for build command with failure');
        const { error: updateError } = await supabase
          .from('builds')
          .update({
            build_status: 'FAILED',
            build_log: buildLog,
            build_context: cdkContext,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId);
        if (updateError) throw updateError;
        console.log('Supabase update for build failure successful');
        
        throw buildStartError;
      }

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
