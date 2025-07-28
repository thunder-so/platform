import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import { EventBridgeEvent, Context } from "aws-lambda";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { CodeBuild, CodeBuildClient, BatchGetBuildsCommand } from "@aws-sdk/client-codebuild";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { CodePipelineClient, StartPipelineExecutionCommand } from "@aws-sdk/client-codepipeline";
import { createClient } from '@supabase/supabase-js';
import Plunk from '@plunk/node';
import { render } from '@react-email/render';
import { StackInstalled } from 'emails/stack-installed';

const REGION = process.env.REGION;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL and Key not found.');
}

/**
 * Transactional Email
 */
async function sendEmail(
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

    // @ts-expect-error
    const plunk = new Plunk.default(plunkApiKey as string);

    // const body = await render(<StackInstalled applicationId=applicationId CloudFrontDistributionUrl=CloudFrontDistributionUrl />);
    const body = await render(StackInstalled({ 
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
        subject: "Application installed on your AWS account",
        body,
    });

  } catch (error) {
    throw error;
  }
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
  const artifactLocation = event.detail['additional-information']?.artifact?.location;
  const buildLogs = event.detail['additional-information']?.logs;

  try {

    /**
     * Get the Build Information
     * 
     * - BatchGetBuildsCommand
     * - Update event
     * - Fetch the event schema
     */
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

    // Store the event in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // buildStatus SUCCEEDED sometimes comes twice 

    // check for existing build event and return if already set to SUCCEEDED
    const { data: existingBuildEvent } = await supabase
        .from('builds')
        .select('*')
        .eq('build_id', buildId)
        .single();

    if (existingBuildEvent.build_status === 'SUCCEEDED' ) {
      console.log('buildStatus already set to SUCCEEDED, skipping...')
      return;
    }

    // Update Supabase DB
    const { data, error } = await supabase
        .from('builds')
        .update({
            build_status: buildStatus,
            build_log: buildLogs,
            build_end: build.endTime?.toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('build_id', buildId)
        // .select();

    if (error) {
        throw error;
    }

    // If the build fails, go no further
    if (buildStatus !== 'SUCCEEDED') {
      console.log('buildStatus is not SUCCEEDED, skipping...')
      return;
    }

    // Fetch the event schema (up to application) using build_id
    const { data: eventSchema, error: eventFetchError } = await supabase
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
        .eq('build_id', buildId)
        .single();

    if (eventFetchError) {
        throw eventFetchError;
    }

    // Fetch the service
    const service = eventSchema.service;

    // Fetch the environment where the service belongs
    const environment = service.environment;

    // Fetch providers by environment.provider_id
    const provider = environment.provider;

    // Fetch application where environment belongs
    const application = environment.application;

    const stackPrefix = `${application.name.toLowerCase().replace(/[-\s._]/g, '')}-${service.name.toLowerCase().replace(/[-\s._]/g, '')}-${environment.id}`;

    // Log the fetched data for debugging
    // console.log('eventSchema:', eventSchema);

    """    /**
     * Get the Stack Outputs and Update Service
     * 
     * - STS AssumeRoleCommand
     * - DescribeStacksCommand
     * - Stack Outputs
     * - Update service
     */
    let credentials;

    if (provider.role_arn) {
      const assumeRoleParams = {
        RoleArn: provider.role_arn,
        RoleSessionName: "StackInquirySession",
        ExternalId: provider.id
      };
  
      const sts = new STSClient({ region: REGION });
      const assumedRole = await sts.send(new AssumeRoleCommand(assumeRoleParams));
      credentials = assumedRole.Credentials;
    } else {
      // @ts-expect-error
      const parametersProvider = new SSMProvider();
      const secretAccessKey = await parametersProvider.get(`/thunder/provider/${provider.id}/secret_access_key`, { decrypt: true });
      credentials = {
        AccessKeyId: provider.access_key_id,
        SecretAccessKey: secretAccessKey,
      }
    }""
  
    const client = new CloudFormationClient({ 
      credentials: {
        accessKeyId: credentials?.AccessKeyId as string,
        secretAccessKey: credentials?.SecretAccessKey as string,
        sessionToken: credentials?.SessionToken
      },
      region: environment.region
    });

    // Create the command to describe the stack
    const command = new DescribeStacksCommand({
      StackName: `${stackPrefix}-stack`
    });

    // Send the command
    const response = await client.send(command);

    // Check if the stack exists and has outputs
    if (!response.Stacks || response.Stacks.length === 0 || !response.Stacks[0].Outputs) {
      throw new Error(`Stack not found or has no outputs`);
    }

    // Check if the stack has failed to install
    if (response.Stacks[0].StackStatus === 'ROLLBACK_COMPLETE' || response.Stacks[0].StackStatus === 'ROLLBACK_FAILED') {
      throw new Error(`Stack installation failed with status: ${response.Stacks[0].StackStatus}`);
    }

    // Convert the outputs to a key-value object
    const outputs: Record<string, string> = {};
    response.Stacks[0].Outputs.forEach(output => {
      if (output.ExportName && output.OutputValue) {
        outputs[output.ExportName] = output.OutputValue;
      }
    });

    // Trim the app name from the keys and keep only the specified keys
    const trimmedOutputs: Record<string, string> = {};
    const keysToKeep = ['CodePipelineName', 'CloudFrontDistributionUrl', 'CloudFrontDistributionId'];

    for (const [key, value] of Object.entries(outputs)) {
        const trimmedKey = keysToKeep.find(k => key.endsWith(k));
        if (trimmedKey) {
            trimmedOutputs[trimmedKey] = value;
        }
    }

    console.log("Outputs", JSON.stringify(trimmedOutputs));

    // Update Supabase DB
    const { data: updateService, error: updateServiceError } = await supabase
        .from('services')
        .update({
            resources: trimmedOutputs,
            updated_at: new Date().toISOString()
        })
        .eq('id', service.id)
        // .select();

    if (updateServiceError) {
        throw new Error('Error updating service');
    }

    /** 
     *  Transactional Email 
     *  - Fetch user profile using application data
     *  - Invoke send email
     */
    const { data: organizationData, error: organizationFetchError } = await supabase
        .from('applications')
        .select(`
            *,
            organization:organizations(*,
                memberships:memberships(*,
                    user:users(*)
                )
            )
        `)
        .eq('id', application.id)
        .single();

    if (organizationFetchError) {
        throw new Error(`Error fetching organization data: ${organizationFetchError.message}`);
    }

    if (!organizationData) {
        throw new Error('Organization data not found for the application.');
    }

    const organization = organizationData.organization;
    const memberships = organization.memberships;
    const userProfile = [organization.memberships[0].user];

    // console.log("User Profile: ", JSON.stringify(userProfile));

    for (const member of userProfile) {
        await sendEmail(
          member.email, 
          member.full_name,
          application.id, 
          trimmedOutputs.CloudFrontDistributionUrl,
          provider.account_id,
          environment.region,
          service.metadata.repo,
          service.metadata.owner,
          service.metadata.branch
        );
    }

    /**
     * Trigger the pipeline
     * 
     * - StartPipelineExecutionCommand
     */
    const codePipeline = new CodePipelineClient({ 
      credentials: {
        accessKeyId: credentials?.AccessKeyId as string,
        secretAccessKey: credentials?.SecretAccessKey as string,
        sessionToken: credentials?.SessionToken
      },
      region: environment.region
    });

    const StartPipelineCommand = new StartPipelineExecutionCommand({ name: `${stackPrefix}-pipeline` });
    const StartPipelineResponse = await codePipeline.send(StartPipelineCommand);
    console.log(StartPipelineResponse);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Build event recorded successfully' }),
    };

  } catch (error) {
    console.error('Error processing build event:', JSON.stringify(error));
    throw error;
  }
};
