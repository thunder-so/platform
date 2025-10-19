import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import { Context } from "aws-lambda";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { CodeBuild, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { CodePipelineClient, StartPipelineExecutionCommand } from "@aws-sdk/client-codepipeline";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const REGION = process.env.REGION;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Supabase URL, Key, and Service Key not found.');
}

const STACK_OUTPUT_KEYS = [
  'CodePipelineName', 'CloudFrontDistributionUrl', 'CloudFrontDistributionId',
  'ApiGatewayUrl', 'LambdaFunction', 'LambdaFunctionUrl', 'LoadBalancerDNS'
] as const;

const FAILED_STATUSES = ['FAILED', 'STOPPED'] as const;

enum BuildStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  FAULT = 'FAULT',
  TIMED_OUT = 'TIMED_OUT',
  STOPPED = 'STOPPED',
}

interface CodeBuildStateChangeEvent {
  'detail-type': 'CodeBuild Build State Change';
  detail: {
    'build-status': BuildStatus;
    'project-name': string;
    'build-id': string;
    'additional-information': {
      artifact: { location: string; };
      logs: {
        'group-name': string;
        'stream-name': string;
        'deep-link': string;
      };
    };
  };
}

type BuildContext = {
  service: {
    id: string;
    name: string;
    owner: string;
    repo: string;
    branch: string;
    environment_id: string;
    environment: {
      id: string;
      name: string;
      region: string;
      provider: {
        id: string;
        role_arn?: string;
        access_key_id?: string;
        account_id: string;
      };
      application: {
        id: string;
        name: string;
        display_name: string;
        organization_id: string;
      };
    };
  };
};

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

async function updateBuildState(
  supabase: SupabaseClient,
  buildArn: string,
  buildStatus: BuildStatus,
  buildLogs: any,
  buildEndTime?: string
): Promise<void> {
  const updateData: any = {
    build_status: buildStatus,
    build_log: buildLogs,
    updated_at: new Date().toISOString(),
  };

  if (buildEndTime) {
    updateData.build_end = buildEndTime;
  }

  // Try to update existing record
  const { data, error } = await supabase
    .from('builds')
    .update(updateData)
    .eq('build_id', buildArn)
    .select();

  if (error) {
    throw new Error(`Failed to update build state: ${error.message}`);
  }
}

async function fetchBuildContext(
  supabase: SupabaseClient,
  buildArn: string
): Promise<BuildContext | null> {
  const { data, error } = await supabase
    .from('builds')
    .select(`
      *,
      service:services(*, 
        environment:environments(*, 
          provider:providers(*), 
          application:applications(*)
        )
      )
    `)
    .eq('build_id', buildArn)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch build context: ${error.message}`);
  }

  return data as BuildContext;
}

async function getAwsCredentials(
  provider: BuildContext['service']['environment']['provider'],
  organizationId: string
): Promise<AwsCredentials> {
  if (provider.role_arn) {
    const sts = new STSClient({ region: REGION });
    const { Credentials } = await sts.send(new AssumeRoleCommand({
      RoleArn: provider.role_arn,
      RoleSessionName: "StackInquirySession",
      ExternalId: organizationId
    }));

    if (!Credentials?.AccessKeyId || !Credentials?.SecretAccessKey) {
      throw new Error('Failed to assume role');
    }

    return {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken
    };
  }

  const parametersProvider = new SSMProvider();
  const secretAccessKey = await parametersProvider.get(
    `/thunder/${organizationId}/${provider.access_key_id}/secretAccessKey`, 
    { decrypt: true }
  );

  if (!provider.access_key_id || !secretAccessKey) {
    throw new Error('Missing AWS credentials');
  }

  return {
    accessKeyId: provider.access_key_id,
    secretAccessKey: secretAccessKey as string
  };
}

async function getStackOutputs(
  credentials: AwsCredentials,
  region: string,
  stackName: string
): Promise<Record<string, string>> {
  const client = new CloudFormationClient({
    credentials,
    region
  });

  const { Stacks } = await client.send(new DescribeStacksCommand({
    StackName: stackName
  }));

  const stack = Stacks?.[0];
  if (!stack?.Outputs) {
    throw new Error(`Stack ${stackName} not found or has no outputs`);
  }

  if (stack.StackStatus === 'CREATE_FAILED' || stack.StackStatus === 'ROLLBACK_COMPLETE' || stack.StackStatus === 'ROLLBACK_FAILED') {
    throw new Error(`Stack installation failed with status: ${stack.StackStatus}`);
  }

  const outputs: Record<string, string> = {};
  stack.Outputs.forEach(output => {
    if (output.ExportName && output.OutputValue) {
      const trimmedKey = STACK_OUTPUT_KEYS.find(k => output.ExportName!.endsWith(k));
      if (trimmedKey) {
        outputs[trimmedKey] = output.OutputValue;
      }
    }
  });

  return outputs;
}

// async function triggerPipeline(
//   credentials: AwsCredentials,
//   region: string,
//   pipelineName: string
// ): Promise<void> {
//   const codePipeline = new CodePipelineClient({ credentials, region });
//   await codePipeline.send(new StartPipelineExecutionCommand({ name: pipelineName }));
// }

async function sendNotification(
  supabase: SupabaseClient,
  type: 'APP_BUILD_SUCCESS' | 'APP_BUILD_FAILURE',
  buildContext: BuildContext,
  buildId: string,
  buildStatus?: BuildStatus,
  outputs?: Record<string, string>
): Promise<void> {
  const { service } = buildContext;
  const { environment } = service;
  const { application, provider } = environment;

  const baseMetadata = {
    application_id: application.id,
    application_name: application.display_name,
    repository: `${service.owner}/${service.repo}`,
    branch: service.branch,
    build_id: buildId,
    account_id: provider.account_id,
    region: environment.region
  };

  const metadata = type === 'APP_BUILD_SUCCESS' ? {
    ...baseMetadata,
    application_url: outputs?.CloudFrontDistributionUrl || outputs?.ApiGatewayUrl || outputs?.LoadBalancerDNS,
    domain: outputs?.CloudFrontDistributionUrl?.replace('https://', '')
  } : {
    ...baseMetadata,
    error_message: `Build failed with status: ${buildStatus}`
  };

  await supabase
    .from('notifications')
    .insert({
      organization_id: application.organization_id,
      environment_id: environment.id,
      type,
      channel: 'EMAIL',
      metadata
    });
}

export const handler = async (event: CodeBuildStateChangeEvent, context: Context) => {
  console.log('Processing build event:', event);

  const buildId = event.detail['build-id'];
  const buildStatus = event.detail['build-status'];
  const buildLogs = event.detail['additional-information']?.logs;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Get build details from CodeBuild
    const codebuild = new CodeBuild({ region: REGION });
    const { builds } = await codebuild.send(new BatchGetBuildsCommand({ ids: [buildId] }));
    const build = builds?.[0];

    if (!build) {
      throw new Error(`Build ${buildId} not found`);
    }

    const buildArn = build.arn;
    if (!buildArn) {
      throw new Error(`Build ARN not found for ${buildId}`);
    }

    // Update build state idempotently
    await updateBuildState(
      supabase,
      buildArn,
      buildStatus,
      buildLogs,
      build.endTime?.toISOString()
    );

    // Fetch build context
    const buildContext = await fetchBuildContext(supabase, buildArn);
    
    // If build context not found, skip processing (build not in database yet)
    if (!buildContext) {
      console.log(`Skipping processing - build context not found for ARN: ${buildArn}`);
      return { statusCode: 200, body: JSON.stringify({ message: 'Build context not found, skipping' }) };
    }

    const { service } = buildContext;
    const { environment } = service;
    const { provider, application } = service.environment;

    // Handle failed builds
    if (FAILED_STATUSES.includes(buildStatus as any)) {
      console.log(`Build failed with status: ${buildStatus}`);
      await sendNotification(supabase, 'APP_BUILD_FAILURE', buildContext, buildArn, buildStatus);
      return { statusCode: 200, body: JSON.stringify({ message: 'Build failure processed' }) };
    }

    // Handle successful builds
    if (buildStatus === 'SUCCEEDED') {
      console.log('Processing successful build');
      
      const stackPrefix = `${application.name}-${service.name}-${environment.name}`;
      const credentials = await getAwsCredentials(provider, application.organization_id);
      
      // Get stack outputs and update service
      const outputs = await getStackOutputs(credentials, environment.region, `${stackPrefix}-stack`);
      
      await supabase
        .from('services')
        .update({
          resources: outputs,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id);

      // Trigger pipeline
      // await triggerPipeline(credentials, environment.region, `${stackPrefix}-pipeline`);
      
      // Send success notification
      await sendNotification(supabase, 'APP_BUILD_SUCCESS', buildContext, buildArn, undefined, outputs);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Build event processed successfully' })
    };

  } catch (error) {
    console.error('Error processing build event:', error);
    throw error;
  }
};