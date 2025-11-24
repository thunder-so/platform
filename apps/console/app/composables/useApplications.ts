import type { ApplicationSchema } from '~~/server/validators/app';

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
          id,
          name,
          display_name,
          organization_id,
          environments (
            id,
            name,
            display_name,
            region,
            user_access_token:user_access_tokens(
              secret_id,
              resource
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
      
      applicationSchema.value = (data || {}) as unknown as ApplicationSchema;
      appId.value = applicationSchema.value.id;
      return applicationSchema.value;
    } catch (e) {
      isError.value = true;
      const { $posthog } = useNuxtApp();
      $posthog().capture('app_fetch_failed', {
        app_id: id,
        error: (e as Error).message
      });
      console.error("Failed to fetch or validate application schema", e);
      return null;
    }
    finally {
      isLoading.value = false;
    }
  };

  const setApplicationSchemaById = async (id: string) => {
    return await fetchApplicationSchema(id);
  };

  const refreshApplicationSchema = async () => {
    return await fetchApplicationSchema(appId.value);
  };

  const clearApplicationSchema = () => {
    applicationSchema.value = null;
    appId.value = null;
    isLoading.value = false;
    isError.value = false;
  };

  const currentEnvironment = computed(() => {
    if (!applicationSchema.value) return null;
    return applicationSchema.value.environments[0] ?? null;
  });

  const currentService = computed(() => {
    if (!currentEnvironment.value) return null;
    return currentEnvironment.value.services[0] ?? null;
  });

  const hasAccessToApp = (appId: string): boolean => {
    const { memberships } = useMemberships()
    if (!appId || !applicationSchema.value) return false
    return memberships.value.some(m => m.id === applicationSchema.value?.organization_id)
  }

  return {
    applicationSchema,
    isLoading,
    isError,
    refreshApplicationSchema,
    setApplicationSchemaById,
    clearApplicationSchema,
    appId,
    currentEnvironment,
    currentService,
    hasAccessToApp
  };
};
