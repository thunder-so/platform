import type { ApplicationSchema } from '~/server/db/schema';

export const useApplications = () => {
  const supabase = useSupabaseClient();
  const appId = useState<string | null>('currentAppId', () => null);
  const applicationSchema = useState<ApplicationSchema | null>('currentApplicationSchema', () => null);
  const isLoading = useState<boolean>('currentApplicationSchemaLoading', () => false);
  const isError = useState<boolean>('currentApplicationSchemaError', () => false);

  const fetchApplicationSchema = async (id: string | null) => {
    if (!id) return null;
    try {
      isLoading.value = true;
      isError.value = false;
      const { data, error } = await supabase
        .from('applications')
        .select(`
          name,
          display_name,
          environments (
            name,
            display_name,
            region,
            user_access_token:user_access_tokens(
              secret_id
            ),
            provider:providers (
              id,
              alias,
              role_arn,
              account_id,
              region,
              stack_id,
              stack_name,
              access_key_id,
              secret_id,
              organization_id,
              created_at,
              updated_at
            ),
            services (
              id,
              name,
              display_name,
              stack_type,
              stack_version,
              owner,
              repo,
              branch,
              metadata,
              resources,
              environment_id,
              installation_id
            )
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .is('environments.deleted_at', null)
        .is('environments.services.deleted_at', null)
        .single();

      if (error) throw error;
      
      applicationSchema.value = data as ApplicationSchema;
      return applicationSchema.value;
    } catch (e) {
      isError.value = true;
      console.error("Failed to fetch or validate application schema", e);
      return null;
    }
    finally {
      isLoading.value = false;
    }
  };

  const setApplicationSchemaById = async (id: string) => {
    const changed = appId.value !== id;
    appId.value = id;
    if (changed) {
      const promise = fetchApplicationSchema(id);
      if (process.server) {
        // During SSR we should wait for the fetch so the server-rendered HTML contains the schema
        try {
          await promise;
        } catch (e) {
          // Error is already handled in fetchApplicationSchema, but we log it here for SSR context
          console.error('Failed to fetch application schema during SSR', e);
        }
      } else {
        // Client: don't block, but surface errors
        promise.catch((e) => {
          // Error is already handled in fetchApplicationSchema
        });
      }
    }
    return changed;
  };

  const refreshApplicationSchema = async () => {
    return await fetchApplicationSchema(appId.value);
  };

  return {
    applicationSchema,
    isLoading,
    isError,
    refreshApplicationSchema,
    setApplicationSchemaById,
    appId,
  };
};
