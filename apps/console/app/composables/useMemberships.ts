import type { Organization, Membership, Subscription, Order, ProductMetadata, Price } from '~~/server/db/schema';
import { usePlans } from '~/composables/usePlans';
import { computed } from 'vue';

type OrganizationWithMetadata = {
  id: string;
  name: string;
  pending: boolean;
  orgPending: boolean;
  subscriptions: Subscription[];
  orders: Order[];
};

export const useMemberships = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const route = useRoute();
  const selectedOrgIdCookie = useCookie('selected-org-id');
  
  const memberships = useState<OrganizationWithMetadata[]>('memberships', () => [])
  const selectedOrganization = useState<OrganizationWithMetadata | undefined>('selectedOrganization', () => undefined)
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
            subscriptions (id, status, metadata, current_period_start, current_period_end, cancel_at_period_end),
            orders (id, metadata, created_at)
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
    if (activeSub?.metadata) {
      const metadata = activeSub.metadata as { product: ProductMetadata; price: Price };
      if (metadata.product) {
        return {
          id: metadata.product.id,
          name: metadata.product.name,
          description: metadata.product.description ?? null,
          metadata: { price: metadata.price }
        };
      }
    }
    
    const order = org.orders?.[0];
    if (order?.metadata) {
      const metadata = order.metadata as { product: ProductMetadata; price: Price };
      if (metadata.product) {
        return {
          id: metadata.product.id,
          name: metadata.product.name,
          description: metadata.product.description ?? null,
          metadata: { price: metadata.price }
        };
      }
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
