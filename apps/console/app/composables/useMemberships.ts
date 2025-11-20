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
  const { $posthog } = useNuxtApp();
  
  const memberships = useState<OrganizationWithMetadata[]>('memberships', () => [])
  const selectedOrganization = useState<OrganizationWithMetadata | undefined>('selectedOrganization', () => undefined)
  const isLoading = useState('memberships.loading', () => false)
  const isInitialized = useState('memberships.initialized', () => false)

  const refreshMemberships = async () => {
    if (!user.value?.sub || isLoading.value) return

    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`id, pending,
          organizations (
            id, name, pending,
            subscriptions (id, status, metadata, current_period_start, current_period_end, cancel_at_period_end, created),
            orders (id, metadata, created_at)
          )
        `)
        .eq('user_id', user.value.sub)
        .is('deleted_at', null)

      if (error) throw error

      const flattened = (data as any[])?.map((membership: Membership) => ({
        id: membership.organizations[0]?.id,
        name: membership.organizations[0]?.name,
        pending: membership.pending,
        orgPending: membership.organizations[0]?.pending,
        subscriptions: (membership.organizations.subscriptions || [])
          .filter((sub: any) => sub.status !== 'canceled')
          .sort((a: any, b: any) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime()),
        orders: membership.organizations.orders || []
      })).filter((org: any) => !org.orgPending) || [];

      // @ts-expect-error 
      memberships.value = flattened;
    } catch (e) {      
      $posthog().capture('membership_fetch_failed', {
        user_id: user.value.id,
        error: (e as Error).message
      });
      console.error('error loading memberships')
    } finally {
      isLoading.value = false
    }
  }

  const initializeSession = async () => {
    if (isInitialized.value || !user.value?.sub) return
    
    await refreshMemberships();
    isInitialized.value = true

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
    
    const activeSub = org.subscriptions
      ?.filter(sub => sub.status !== 'canceled')
      ?.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())
      ?.[0];
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
