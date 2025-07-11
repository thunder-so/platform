
import { Context } from 'aws-lambda';
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { CodePipelineClient, GetPipelineExecutionCommand, GetPipelineStateCommand } from "@aws-sdk/client-codepipeline";
import { CodeBuild, CodeBuildClient, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
// import Plunk from '@plunk/node';
// import { render } from '@react-email/render';
// import { DeploySuccess } from 'emails/deploy-success';
// import { DeployFailed } from 'emails/deploy-failed';

const REGION = process.env.REGION;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL and Key not found.');
}

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

/**
 *  Transactional Email 
 *
async function sendEmail(
  type: string,
  email: string, 
  username: string,
  applicationId: string, 
  CloudFrontDistributionUrl: string, 
  accountId: string, 
  region: string,
  repo: string,
  owner: string,
  branch: string
) {
  try {
    const plunkApiKey = process.env.PLUNK_TOKEN;

    const plunk = new Plunk.default(plunkApiKey as string);

    if (type === "Succeeded") {
      const body = await render(DeploySuccess({ 
        username,
        applicationId, 
        CloudFrontDistributionUrl, 
        accountId, 
        region, 
        repo,
        owner,
        branch
      }));
      
      const success = await plunk.emails.send({
          to: email,
          subject: "Application deployed on your AWS account",
          body,
      });
    }

    if (type === "Failed") {
      // const body = await render(DeploySuccess({ 
      //   username,
      //   applicationId, 
      //   accountId, 
      //   region, 
      //   repo,
      //   owner,
      //   branch
      // }));
      
      // const success = await plunk.emails.send({
      //     to: email,
      //     subject: "Application deployed on your AWS account",
      //     body,
      // });
    }

  } catch (error) {
    throw error;
  }
}
/** */

export const handler = async (event: CodePipelineEvent, context: Context) => {
    console.log('Received message:', JSON.stringify(event));

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // fetch the service from pipeline name
    const { data: service, error: servicesFetchError } = await supabase
      .from('services')
      .select(`
        *,
        environment:environments(
          *,
          provider:providers(*)
        )
      `)
      .eq('resources->>CodePipelineName', event.detail.pipeline)
      .single();

    if (servicesFetchError) {
      console.error(`Error fetching service from Supabase: ${JSON.stringify(servicesFetchError, null, 2)}`);
      throw new Error(`Error fetching service from Supabase: ${JSON.stringify(servicesFetchError, null, 2)}`);
    }

    const environment = service.environment;

    // // Fetch the provider using environmentId
    // const { data: environment, error: environmentFetchError } = await supabase
    //     .from('environments')
    //     .select(`
    //         *,
    //         provider:providers(*)
    //     `)
    //     .eq('id', body.environmentId)
    //     .single();

    // if (environmentFetchError) {
    //   console.error(`Error fetching environment from Supabase: ${environmentFetchError}`);
    //   throw new Error(`Error fetching environment from Supabase: ${environmentFetchError}`);
    // }

    const provider = environment.provider;

    // STS using provider
    const assumeRoleParams = {
      RoleArn: provider.role_arn,
      RoleSessionName: "PipelineInquirySession",
      ExternalId: provider.id
    };

    const sts = new STSClient({ region: REGION });
    const assumedRole = await sts.send(new AssumeRoleCommand(assumeRoleParams));
    const credentialedArn = assumedRole.AssumedRoleUser?.Arn;
    const credentials = assumedRole.Credentials;
  
    const codePipeline = new CodePipelineClient({ 
      credentials: {
        accessKeyId: credentials?.AccessKeyId as string,
        secretAccessKey: credentials?.SecretAccessKey as string,
        sessionToken: credentials?.SessionToken
      },
      region: environment.region
    });

    /**
     * Get Pipeline State
     */
    const pipelineStateParams = {
      name: event.detail["pipeline"],
    }
    
    const pipelineState = new GetPipelineStateCommand(pipelineStateParams);
    const state = await codePipeline.send(pipelineState);
    console.log('GetPipelineStateCommand:', JSON.stringify(state));

    const sourceStage = state.stageStates?.find(stage => stage.stageName === "Source");
    const sourceAction = sourceStage?.actionStates?.find(action => action.actionName === "GithubSourceAction");
    let sourceMetadata:Metadata = {
      revisionId: sourceAction?.currentRevision?.revisionId,
      revisionSummary: sourceAction?.latestExecution?.summary,
      revisionUrl: sourceAction?.revisionUrl,
      entityUrl: sourceAction?.entityUrl
    }

    /* 
     * Check if initial pipeline event
     * and store state
     */
    if (event.detail.state === "STARTED") {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          id: uuidv4(),
          pipeline_event_id: event.id,
          pipeline_execution_id: event.detail["execution-id"],
          pipeline_state: event.detail.state,
          pipeline_start: event.time,
          pipeline_metadata: sourceMetadata,
          // pipeline_log: {},
          service_id: service.id,
          environment_id: environment.id
      }]);

      if (error) {
        console.error(`Error inserting event. ${JSON.stringify(error)}`);
        throw new Error(`Error inserting event. ${JSON.stringify(error)}`);
      }

      return;
    }

    /**
     * Check if pipeline fails at SourceAction
     */
    if (sourceAction?.latestExecution?.status === "Failed") {
      // Save GithubAction error
      // "errorDetails": {
      //   "code": "PermissionError",
      //   "message": "Could not access the GitHub repository. The access token might be invalid or has been revoked. Edit the pipeline to reconnect with GitHub."
      // }
      if (sourceAction?.latestExecution?.errorDetails) {
        sourceMetadata = {
          ...sourceMetadata,
          errorCode: sourceAction.latestExecution.errorDetails.code,
          errorMessage: sourceAction.latestExecution.errorDetails.message
        };
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          pipeline_event_id: event.id,
          pipeline_state: event.detail.state,
          pipeline_end: event.time,
          pipeline_metadata: sourceMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('pipeline_execution_id', event.detail["execution-id"]);

      if (error) {
        console.error(`Error updating event. ${JSON.stringify(error)}`);
        throw new Error(`Error updating event. ${JSON.stringify(error)}`);
      }

      return;
    }

    /**
     * Get more details about the build
     */
    const buildStage = state.stageStates?.find(stage => stage.stageName === "Build");
    const buildAction = buildStage?.actionStates?.find(action => action.actionName === "BuildAction");
    const buildStatus = buildAction?.latestExecution?.status;
    const buildId = buildAction?.latestExecution?.externalExecutionId as string;

    console.log("buildStatus", buildStatus);

    let buildLogs = {};

    if (buildId) {
      const codebuild = new CodeBuild({
        credentials: {
          accessKeyId: credentials?.AccessKeyId as string,
          secretAccessKey: credentials?.SecretAccessKey as string,
          sessionToken: credentials?.SessionToken
        },
        region: environment.region
      });
      const getBuildResponse = await codebuild.send(new BatchGetBuildsCommand({
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

    // check if final pipeline event
    if (buildStatus === 'Succeeded' || buildStatus === 'Failed') {
      // Update existing row
      const { data, error } = await supabase
        .from('events')
        .update({
          pipeline_event_id: event.id,
          pipeline_state: event.detail.state,
          pipeline_end: event.time,
          pipeline_log: buildLogs,
          pipeline_metadata: sourceMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('pipeline_execution_id', event.detail["execution-id"]);

      if (error) {
        console.error(`Error updating event. ${JSON.stringify(error)}`);
        throw new Error(`Error updating event. ${JSON.stringify(error)}`);
      }

      /**
       *  Transactional Email 
       *  - Fetch user profile using environment data
       *  - Invoke send email
       *
      const { data: environmentData, error: environmentDataError } = await supabase
        .from('environments')
        .select(`
            *,
            application:applications(*,
              organization:organizations(*,
                  memberships:memberships(*,
                      user:users(*)
                  )
              )
            )
            
        `)
        .eq('id', body.environmentId)
        .single();

      if (environmentDataError) {
        throw new Error(`Error fetching organization data: ${environmentDataError.message}`);
      }

      if (!environmentData) {
        throw new Error('Organization data not found for the application.');
      }

      const application = environmentData.application;
      const organization = application.organization;
      const memberships = organization.memberships;
      const userProfile = [organization.memberships[0].user];

      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select(`
            *,
              environment:environments(*)
        `)
        .eq('id', body.serviceId)
        .single();

      if (serviceError) {
        throw new Error(`Error fetching organization data: ${serviceError.message}`);
      }

      if (!service) {
        throw new Error('Organization data not found for the application.');
      }

      const environment = service.environment;

      // console.log("service ", JSON.stringify(service));
      for (const member of userProfile) {
        await sendEmail(
          buildStatus,
          member.email, 
          member.full_name,
          application.id,
          service.resources.CloudFrontDistributionUrl,
          provider.account_id,
          environment.region,
          service.metadata.repo,
          service.metadata.owner,
          service.metadata.branch
        );
      }
      /** */

    }
};
