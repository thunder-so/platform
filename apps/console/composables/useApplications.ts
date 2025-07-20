export type Service = {
  id: string;
  name: string;
  display_name: string;
  stack_type: 'SPA' | 'LAMBDA' | 'ECS';
};

export type Provider = {
  id: string;
  alias: string;
  account_id: string;
}

export type Environment = {
  id: string;
  name: string;
  display_name: string;
  region: string;
  services: Service[];
  provider: Provider;
};

export type ApplicationSchema = {
  id: string;
  name: string;
  display_name: string;
  organization_id: string;
  environments: Environment[];
};

export const useApplications = () => {
  const supabase = useSupabaseClient();

  const applicationSchema = useState<ApplicationSchema | null>('applicationSchema', () => null);
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
            services (
              id,
              name,
              display_name,
              stack_type
            ),
            providers (
              id,
              alias,
              account_id
            )
          )
        `)
        .eq('id', appId)
        .is('deleted_at', null)
        .is('environments.deleted_at', null)
        .is('environments.services.deleted_at', null)

      if (error) throw error;
      applicationSchema.value = data[0] || null;
    } catch (e) {
      console.error('Error fetching application schema:', e);
    } finally {
      isLoading.value = false;
      console.log('Application schema fetched:', applicationSchema.value);
    }
  };

  const setSelectedApplication = async (appId: string) => {
    if (appId) {
      console.log('Setting selected application:', appId);
      await fetchApplicationSchema(appId);
    }
  };

  return {
    applicationSchema: readonly(applicationSchema),
    isLoading: readonly(isLoading),
    setSelectedApplication,
  };
};
