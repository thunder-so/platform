import type { ApplicationSchema } from '~/server/db/schema';

export const useApplications = () => {
  const supabase = useSupabaseClient();
  const applicationSchema = useState<ApplicationSchema>('applicationSchema');
  const isLoading = useState('applications.loading', () => false);

  const fetchApplicationSchema = async (appId: string) => {
    isLoading.value = true;
    try {
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
        .eq('id', appId)
        .is('deleted_at', null)
        .is('environments.deleted_at', null)
        .is('environments.services.deleted_at', null)
        .single();

      if (error) throw error;
      applicationSchema.value = data;
    } catch (e) {
      console.error('Error fetching application schema:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const refreshApplicationSchema = async () => {
    if (applicationSchema.value?.id) {
      await fetchApplicationSchema(applicationSchema.value.id);
    }
  };

  const setApplicationSchemaById = async (appId: string) => {
    await fetchApplicationSchema(appId);
  };

  return {
    applicationSchema,
    isLoading: readonly(isLoading),
    fetchApplicationSchema,
    refreshApplicationSchema,
    setApplicationSchemaById,
  };
};
