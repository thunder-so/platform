import type { ApplicationSchema } from '~/server/db/schema';

export const useApplications = () => {
  const supabase = useSupabaseClient();
  const appId = ref<string | null>(null);

  const { data: applicationSchema, pending: isLoading, refresh: refreshApplicationSchema } = useAsyncData(
    'applicationSchema',
    async () => {
      if (!appId.value) return null;
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
        .eq('id', appId.value)
        .is('deleted_at', null)
        .is('environments.deleted_at', null)
        .is('environments.services.deleted_at', null)
        .single();

      if (error) throw error;
      return data as ApplicationSchema;
    },
    {
      watch: [appId]
    }
  );

  const setApplicationSchemaById = (id: string) => {
    appId.value = id;
  };

  if (process.client) {
    const route = useRoute();
    watch(() => route.params.app_id, (newAppId) => {
      if (newAppId) {
        setApplicationSchemaById(newAppId as string);
      }
    });
  }

  return {
    applicationSchema,
    isLoading,
    refreshApplicationSchema,
    setApplicationSchemaById,
  };
};
