import type { Membership } from '~~/server/db/schema';
import { usePlans } from '~/composables/usePlans';
import { computed } from 'vue';

export const useMemberships = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const route = useRoute();
  const selectedOrgIdCookie = useCookie('selected-org-id');
  
  const memberships = useState<any[]>('memberships', () => [])
  const selectedOrganization = useState<any | undefined>('selectedOrganization', () => undefined)
  const isLoading = useState('memberships.loading', () => false)

  const refreshMemberships = async () => {
    if (!user.value) return

    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`id, pending,
          organizations (
            id, name, pending,
            subscriptions (id, status, metadata),
            orders (id, metadata)
          )
        `)
        .eq('user_id', user.value.id)
        .is('deleted_at', null)

      if (error) throw error

      const flattened = (data as any[])?.map((membership: any) => ({
        id: membership.organizations.id,
        name: membership.organizations.name,
        pending: membership.pending,
        orgPending: membership.organizations.pending,
        subscriptions: membership.organizations.subscriptions || [],
        orders: membership.organizations.orders || []
      })).filter((org: any) => !org.orgPending) || [];

      memberships.value = flattened;
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

  const { plans } = usePlans();
  const currentPlan = computed(() => {
    const org = selectedOrganization.value;
    if (!org) return plans.value.find(p => p.id === 'free');
    
    const activeSub = org.subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing');
    if (activeSub?.metadata?.product) {
      return {
        id: activeSub.metadata.product.id,
        name: activeSub.metadata.product.name,
        description: activeSub.metadata.product.description ?? null,
        metadata: { price: activeSub.metadata.price }
      };
    }
    
    const order = org.orders?.[0];
    if (order?.metadata?.product) {
      return {
        id: order.metadata.product.id,
        name: order.metadata.product.name,
        description: order.metadata.product.description ?? null,
        metadata: { price: order.metadata.price }
      };
    }
    
    return plans.value.find(p => p.id === 'free');
  });

  const hasAccessToOrg = (orgId: string): 'member' | 'invitee' | 'no-access' => {
    const membership = memberships.value.find(m => m.id === orgId)
    if (!membership) return 'no-access'
    return membership.pending ? 'invitee' : 'member'
  }

  const getPendingInvite = (orgId: string) => {
    return memberships.value.find(m => m.id === orgId && m.pending)
  }

  const resetOrgIdCookie = () => {
    selectedOrgIdCookie.value = null
  }

  return {
    memberships: readonly(memberships),
    selectedOrganization,
    isLoading: readonly(isLoading),
    refreshMemberships,
    initializeSession,
    setSelectedOrganization,
    currentPlan,
    hasAccessToOrg,
    getPendingInvite,
    resetOrgIdCookie
  }
}
