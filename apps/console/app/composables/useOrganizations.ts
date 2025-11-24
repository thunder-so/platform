export type ApplicationDisplaySchema = {
  id: string;
  name: string;
  display_name: string;
  organization_id: string;
  created_at: string;
  environments: {
    id: string;
    name: string;
    display_name: string;
    region: string;
    services: {
      id: string;
      name: string;
      display_name: string;
      stack_type: string;
      stack_version: string;
      owner: string;
      repo: string;
      branch: string;
      metadata: any;
      resources: any;
      environment_id: string;
      installation_id: number;
      updated_at: string;
    }[];
  }[];
};

export const useOrganizations = () => {
  const supabase = useSupabaseClient()

  const applicationsByOrganization = useState<Record<string, ApplicationDisplaySchema[]>>('appsByOrg', () => ({}))
  const appsLoading = useState<boolean>('appsByOrgLoading', () => false)
  const appsError = useState<any | null>('appsByOrgError', () => null)

  const fetchApplicationsByOrganization = async (orgId: string) => {
    if (!orgId) return [] as ApplicationDisplaySchema[]
    try {
      appsLoading.value = true
      appsError.value = null

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          name,
          display_name,
          organization_id,
          created_at,
          environments (
            id,
            name,
            display_name,
            region,
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
              installation_id,
              updated_at
            )
          )
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .is('environments.deleted_at', null)
        .is('environments.services.deleted_at', null)

      if (error) throw error

      applicationsByOrganization.value = {
        ...applicationsByOrganization.value,
        [orgId]: (data || []) as ApplicationDisplaySchema[]
      }

      return applicationsByOrganization.value[orgId]
    } catch (e) {
      appsError.value = e
      applicationsByOrganization.value[orgId] = []
      return [] as ApplicationDisplaySchema[]
    } finally {
      appsLoading.value = false
    }
  }

  return {
    applicationsByOrganization,
    appsLoading,
    appsError,
    fetchApplicationsByOrganization
  }
}

export default useOrganizations
