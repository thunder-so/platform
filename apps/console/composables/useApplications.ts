import type { ApplicationSchema } from '~/server/db/schema';

export const useApplications = () => {
  const supabase = useSupabaseClient();
  const appId = useState<string | null>('currentAppId', () => null);
  const applicationSchema = useState<ApplicationSchema | null>('currentApplicationSchema', () => null);
  const isLoading = useState<boolean>('currentApplicationSchemaLoading', () => false);

  const fetchApplicationSchema = async (id: string | null) => {
    if (!id) return null;
    try {
      isLoading.value = true;
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          name,
          display_name,
          organization_id,
          environments (
            id,
            name,
            display_name,
            region,
            provider:providers!inner (
              id,
              alias,
              account_id
            ),
            services (
              id,
              name,
              display_name,
              stack_type,
              stack_version,
              resources,
              metadata,
              app_props,
              cdn_props,
              edge_props,
              domain_props,
              pipeline_props,
              created_at,
              updated_at,
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
    } finally {
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
          console.error('Failed to fetch application schema during SSR', e);
        }
      } else {
        // Client: don't block, but surface errors
        promise.catch((e) => {
          console.error('Failed to fetch application schema', e);
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
    refreshApplicationSchema,
    setApplicationSchemaById,
    appId,
  };
};
