// import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import { createClient } from '@supabase/supabase-js';
import {
    CustomResource,
    type Callback,
    type Context,
    type Event,
    type Logger,
} from 'aws-cloudformation-custom-resource';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL and Key not found.');
}

/**
 * EVENT
 */
export interface ResourceProperties {
    readonly Alias: string;
    readonly ProviderId: string;
    readonly RoleArn: string;
    readonly Region: string;
    readonly AccountId: string;
    readonly StackName: string;
}

function Create(resource: CustomResource<ResourceProperties>, logger: Logger): Promise<void> {
    return new Promise(async function (resolve, reject) {
        logger.log('Event: ', resource.event);

        // Extract stack details from event
        const { StackId, LogicalResourceId } = resource.event;
        const { Alias, ProviderId, RoleArn, Region, AccountId, StackName } = resource.event.ResourceProperties;
        
        if (!RoleArn || !AccountId) {
            throw new Error('Invalid request.');
        }

        try {
            const supabase = createClient(SUPABASE_URL as string, SUPABASE_KEY as string);

            // Insert provider into Supabase DB
            const { data, error } = await supabase
                .from('providers')
                .upsert({
                    alias: Alias,
                    role_arn: RoleArn,
                    account_id: AccountId,
                    region: Region,
                    stack_id: StackId,
                    stack_name: StackName,
                })
                // .eq('id', ProviderId)
                .select();

            if (error) {
                reject(error);
            }

            if (data) {
                logger.log('provider', data);
            }
            
            // Output: CREATE_COMPLETE
            resource.setPhysicalResourceId(StackName);
            resolve();

        } catch (err) {
            reject(err);
        }
    });
}

function Update(resource: CustomResource<ResourceProperties>, logger: Logger): Promise<void> {
    return new Promise(function (resolve, reject) {
        const event = resource.event;
        logger.log('Update Event:', event);

        resolve();
    });
}

function Delete(resource: CustomResource<ResourceProperties>, logger: Logger): Promise<void> {
    return new Promise(function (resolve, reject) {
        const event = resource.event;
        logger.log('Delete Event:', event);

        resolve();
    });
}

export const handler = function (
    event: Event<ResourceProperties>, 
    context: Context, 
    callback: Callback
) {
    new CustomResource<ResourceProperties>(
        event,
        context,
        callback,
        Create,
        Update,
        Delete
    );
};