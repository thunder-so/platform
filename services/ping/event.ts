import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import { Context } from "aws-lambda";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { CodePipelineClient, GetPipelineExecutionCommand, GetPipelineStateCommand } from "@aws-sdk/client-codepipeline";
import { CodeBuild, CodeBuildClient, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { createClient } from '@supabase/supabase-js';

const REGION = process.env.REGION;

/**
 * Pipeline Event types
 */
interface EventDetail {
  pipeline: string;
  "execution-id": string;
  "start-time": string;
  state: 'STARTED' | 'SUCCEEDED' | 'RESUMED' | 'FAILED' | 'CANCELED' | 'SUPERSEDED';
  version: number;
  "pipeline-execution-attempt": number;
}

interface CodePipelineEvent {
  version: string;
  id: string;
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: EventDetail;
}

/**
 * Metadata
 */
interface Metadata {
  revisionId?: string;
  revisionSummary?: string;
  revisionUrl?: string;
  entityUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

async function getAwsCredentials(
  provider: any,
  organizationId: string
): Promise<AwsCredentials> {
  if (provider.role_arn) {
    const sts = new STSClient({ region: REGION });
    const { Credentials } = await sts.send(new AssumeRoleCommand({
      RoleArn: provider.role_arn,
      RoleSessionName: "PipelineInquirySession",
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

export const handler = async (event: CodePipelineEvent, context: Context) => {
    console.log('Received message:', JSON.stringify(event));

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      throw new Error('Supabase URL and Key not found.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

    /**
     * fetch the service, environment and provider from pipeline name
     */
    const { data: service, error: servicesFetchError } = await supabase
      .from('services')
      .select(`
        *,
        environment:environments(
          *,
          provider:providers(*),
          application:applications(*)
        )
      `)
      .eq('resources->>CodePipelineName', event.detail.pipeline)
      .maybeSingle();

    if (servicesFetchError) {
      console.error(`Error fetching service from Supabase: ${JSON.stringify(servicesFetchError, null, 2)}`);
      throw new Error(`Error fetching service from Supabase: ${JSON.stringify(servicesFetchError, null, 2)}`);
    }

    const environment = service.environment;
    const provider = environment.provider;

    const credentials = await getAwsCredentials(provider, environment.application.organization_id);
  
    const codePipeline = new CodePipelineClient({ 
      credentials,
      region: environment.region
    });

    /**
     * Get Pipeline State
     */
    const pipelineState = new GetPipelineStateCommand({ name: event.detail.pipeline });
    const state = await codePipeline.send(pipelineState);
    console.log('GetPipelineStateCommand:', JSON.stringify(state));

    // Source Stage
    const sourceStage = state.stageStates?.find(stage => stage.stageName === "Source");
    const sourceAction = sourceStage?.actionStates?.find(action => action.actionName === "GithubSourceAction");
    let sourceMetadata:Metadata = {
      revisionId: sourceAction?.currentRevision?.revisionId,
      revisionSummary: sourceAction?.latestExecution?.summary,
      revisionUrl: sourceAction?.revisionUrl,
      entityUrl: sourceAction?.entityUrl
    }

    // Build Stage
    const buildStage = state.stageStates?.find(stage => stage.stageName === "Build");
    const buildAction = buildStage?.actionStates?.find(action => action.actionName === "BuildAction");
    let buildId = buildAction?.latestExecution?.externalExecutionId as string;
    let buildLogs = {};

    /**
     * Check Pipeline State
     */
    switch (event.detail.state) {
      case 'FAILED':
        // check if pipeline failed at SourceAction
        if (sourceAction?.latestExecution?.status === 'Failed') {
          sourceMetadata.errorCode = sourceAction?.latestExecution?.errorDetails?.code;
          sourceMetadata.errorMessage = sourceAction?.latestExecution?.errorDetails?.message;
        }

        // check if pipeline failed at BuildAction
        if (buildAction?.latestExecution?.status === 'Failed') {
          // STS CodeBuildClient
          const codeBuild = new CodeBuildClient({
            credentials,
            region: environment.region
          });

          // get build data
          const getBuildResponse = await codeBuild.send(new BatchGetBuildsCommand({
            ids: [buildId]
          }));
    
          const build = getBuildResponse.builds?.[0];
          console.log("buildData: ", build);
    
          buildLogs = {
            "deep-link": build?.logs?.deepLink,
            "group-name": build?.logs?.groupName,
            "stream-name": build?.logs?.streamName
          };
        }

        // Upsert existing or insert new row
        const { data: dataFailedState, error: errorFailedState } = await supabase
          .from('events')
          .upsert([{
            // pipeline_event_id: event.id,
            pipeline_execution_id: event.detail["execution-id"],
            pipeline_state: event.detail.state,
            pipeline_end: event.time,
            pipeline_log: buildLogs,
            pipeline_metadata: sourceMetadata,
            service_id: service.id,
            environment_id: environment.id,
            updated_at: new Date().toISOString()
          }], 
          {
            onConflict: 'pipeline_execution_id',
            ignoreDuplicates: false
          });

          if (errorFailedState ) {
            console.error("Upsert Error:", errorFailedState);
          }

        // Insert deploy failure notification
        await supabase
          .from('notifications')
          .insert({
            organization_id: environment.application.organization_id,
            environment_id: environment.id,
            type: 'APP_DEPLOY_FAILURE',
            channel: 'EMAIL',
            metadata: {
              application_id: environment.application.id,
              application_name: service.name,
              repository: `${service.owner}/${service.repo}`,
              branch: service.branch,
              commit_sha: sourceMetadata.revisionId || 'unknown',
              commit_message: sourceMetadata.revisionSummary || 'Deploy failed',
              deploy_id: event.detail["execution-id"],
              error_message: sourceMetadata.errorMessage || 'Deploy failed',
              account_id: provider.account_id,
              region: environment.region
            }
          });

        break;
      case 'CANCELED':
        break;
      case 'SUPERSEDED':
        break;
      case 'STARTED':
        // check if initial pipeline event
        const { data: dataStartedState, error: errorStartedState } = await supabase
          .from('events')
          .insert([{
            // id: uuidv4(),
            // pipeline_event_id: event.id,
            pipeline_execution_id: event.detail["execution-id"],
            pipeline_state: event.detail.state,
            pipeline_start: event.time,
            pipeline_metadata: sourceMetadata,
            // pipeline_log: {},
            service_id: service.id,
            environment_id: environment.id
        }]);

        if (errorStartedState) {
          console.error("Insert Error:", errorStartedState);
        }

        break;
      case 'SUCCEEDED':
        // STS CodeBuildClient
        const codeBuild = new CodeBuildClient({
          credentials,
          region: environment.region
        });

        // get build data
        const getBuildResponse = await codeBuild.send(new BatchGetBuildsCommand({
          ids: [buildId]
        }));
  
        const build = getBuildResponse.builds?.[0];
        console.log("buildData: ", build);
  
        buildLogs = {
          "deep-link": build?.logs?.deepLink,
          "group-name": build?.logs?.groupName,
          "stream-name": build?.logs?.streamName
        };
      
        // Update existing row
        const { data: dataSucceededState, error: errorSucceededState } = await supabase
          .from('events')
          .upsert([{
            // pipeline_event_id: event.id,
            pipeline_execution_id: event.detail["execution-id"],
            pipeline_state: event.detail.state,
            pipeline_end: event.time,
            pipeline_log: buildLogs,
            pipeline_metadata: sourceMetadata,
            service_id: service.id,
            environment_id: environment.id,
            updated_at: new Date().toISOString()
          }], 
          {
            onConflict: 'pipeline_execution_id',
            ignoreDuplicates: false
          });

        if (errorSucceededState) {
          console.error("Upsert Error:", errorSucceededState);
        }

        // Insert deploy success notification
        await supabase
          .from('notifications')
          .insert({
            organization_id: environment.application.organization_id,
            environment_id: environment.id,
            type: 'APP_DEPLOY_SUCCESS',
            channel: 'EMAIL',
            metadata: {
              application_id: environment.application.id,
              application_name: service.name,
              application_url: service.resources?.CloudFrontDistributionUrl || service.resources?.ApiGatewayUrl || service.resources?.LoadBalancerDNS,
              domain: service.resources?.CloudFrontDistributionUrl?.replace('https://', ''),
              repository: `${service.owner}/${service.repo}`,
              branch: service.branch,
              commit_sha: sourceMetadata.revisionId || 'unknown',
              commit_message: sourceMetadata.revisionSummary || 'Deploy completed successfully',
              deploy_id: event.detail["execution-id"],
              account_id: provider.account_id,
              region: environment.region
            }
          });
 
        break;
      default:
        console.error(`Unknown event type: ${event}`);
        break;
    }
};
