import { createClient } from '@supabase/supabase-js';
import {
  CustomResource,
  type Callback,
  type Context,
  type Event,
  type Logger,
} from 'aws-cloudformation-custom-resource';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Supabase URL and Service Key not found.');
}

export interface ResourceProperties {
  readonly Alias: string;
  readonly OrganizationId: string;
  readonly RoleArn: string;
  readonly Region: string;
  readonly AccountId: string;
  readonly StackName: string;
}

function Create(resource: CustomResource<ResourceProperties>, logger: Logger): Promise<void> {
  return new Promise(async function (resolve, reject) {
    logger.log('Create Event: ', resource.event);

    const { StackId } = resource.event;
    const { Alias, OrganizationId, RoleArn, Region, AccountId, StackName } = resource.event.ResourceProperties;
    
    if (!RoleArn || !AccountId) {
      return reject('Invalid request: RoleArn and AccountId are required.');
    }

    try {
      const supabase = createClient(SUPABASE_URL as string, SUPABASE_SECRET_KEY as string);
      const { data, error } = await supabase
        .from('providers')
        .insert({
          alias: Alias,
          role_arn: RoleArn,
          account_id: AccountId,
          region: Region,
          stack_id: StackId,
          stack_name: StackName,
          organization_id: OrganizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        return reject(error);
      }

      logger.log('Provider created:', data);
      resource.setPhysicalResourceId(StackName);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function Update(resource: CustomResource<ResourceProperties>, logger: Logger): Promise<void> {
  return new Promise(async function (resolve, reject) {
    logger.log('Update Event:', resource.event);

    const { Alias, OrganizationId, RoleArn, Region, AccountId, StackName } = resource.event.ResourceProperties;

    try {
      const supabase = createClient(SUPABASE_URL as string, SUPABASE_SECRET_KEY as string);
      const { data, error } = await supabase
        .from('providers')
        .update({
            alias: Alias,
            role_arn: RoleArn,
            account_id: AccountId,
            region: Region,
            stack_name: StackName,
            updated_at: new Date().toISOString(),
        })
        .eq('organization_id', OrganizationId);

      if (error) {
        return reject(error);
      }

      logger.log('Provider updated:', data);
      resource.setPhysicalResourceId(StackName);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function Delete(resource: CustomResource<ResourceProperties>, logger: Logger): Promise<void> {
  return new Promise(async function (resolve, reject) {
    logger.log('Delete Event:', resource.event);

    const { Alias, OrganizationId, StackName } = resource.event.ResourceProperties;

    try {
      const supabase = createClient(SUPABASE_URL as string, SUPABASE_SECRET_KEY as string);
      const { data, error } = await supabase
        .from('providers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', OrganizationId)
        .eq('alias', Alias);

      if (error) {
        return reject(error);
      }

      logger.log('Provider deleted:', data);
      resource.setPhysicalResourceId(StackName);
      resolve();
    } catch (err) {
      reject(err);
    }
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