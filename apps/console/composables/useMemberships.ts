export type Membership = {
  id: string,
  pending: boolean,
  name: string,
  status: string
}

export const useMemberships = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const route = useRoute();
  const selectedOrgIdCookie = useCookie('selected-org-id');
  
  const memberships = useState<Membership[]>('memberships', () => [])
  const selectedOrganization = useState<Membership | undefined>('selectedOrganization', () => undefined)
  const isLoading = useState('memberships.loading', () => false)

  const refreshMemberships = async () => {
    if (!user.value) return

    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`id, pending,
          organizations:organization_id (id, name,
            subscriptions(status)
          )
        `)
        .is('organizations.deleted_at', null)
        .eq('user_id', user.value.id)
        .eq('pending', false)
        .is('deleted_at', null)

      if (error) throw error

      const flattened: Membership[] = data?.flatMap(membership => 
        membership.organizations.subscriptions.length > 0
          ? membership.organizations.subscriptions.map(sub => {
              const { subscriptions, ...org } = membership.organizations;
              return { ...org, ...sub };
            })
          : [{ ...membership.organizations, subscriptions: undefined }].map(({ subscriptions, ...org }) => org)
      ) || []

      memberships.value = flattened
    } catch (e) {
      console.error('error loading memberships')
    } finally {
      isLoading.value = false
    }
  }

  const initializeSession = async () => {
    await refreshMemberships();

    const orgIdFromRoute = route.params.org_id as string | undefined;

    if (orgIdFromRoute) {
      const orgFromRoute = memberships.value.find(m => m.id === orgIdFromRoute);
      if (orgFromRoute) {
        selectedOrganization.value = orgFromRoute;
        selectedOrgIdCookie.value = orgFromRoute.id;
        return;
      }
    }

    if (selectedOrgIdCookie.value) {
        const orgFromCookie = memberships.value.find(m => m.id === selectedOrgIdCookie.value)
        if (orgFromCookie) {
            selectedOrganization.value = orgFromCookie;
            return;
        }
    }

    if (memberships.value.length > 0) {
      selectedOrganization.value = memberships.value[0];
      selectedOrgIdCookie.value = memberships.value[0]?.id;
    }
  }

  const setSelectedOrganization = (orgId: string): boolean => {
    const org = memberships.value.find(m => m.id === orgId);
    if (org) {
      selectedOrganization.value = org;
      selectedOrgIdCookie.value = org.id;
      return true
    } else {
      return false
    }
  }

  return {
    memberships: readonly(memberships),
    selectedOrganization,
    isLoading: readonly(isLoading),
    refreshMemberships,
    initializeSession,
    setSelectedOrganization
  }
}
