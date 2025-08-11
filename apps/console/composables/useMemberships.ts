import type { Membership } from '~/server/db/schema';
import { usePlans } from '~/composables/usePlans';
import { computed } from 'vue';

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
            subscriptions(id, status, 
              products(id, active, name, description, metadata)
            )
          )
        `)
        .is('organizations.deleted_at', null)
        .eq('user_id', user.value.id)
        .eq('pending', false)
        .is('deleted_at', null)

      if (error) throw error

      const flattened: Membership[] = (data as any[])?.map((membership: any) => {
        const org = membership.organizations;
        let subs: any[] = [];
        if (org.subscriptions && org.subscriptions.length > 0) {
          subs = org.subscriptions.map((sub: any) => {
            return {
              id: sub.id,
              status: sub.status,
              products: sub.products ? {
                id: sub.products.id,
                name: sub.products.name,
                description: sub.products.description ?? null,
                metadata: sub.products.metadata,
                prices: Array.isArray(sub.products.prices) ? sub.products.prices.map((price: any) => ({
                  id: price.id,
                  type: price.type,
                  price_amount: price.price_amount,
                  price_currency: price.price_currency,
                  recurring_interval: price.recurring_interval
                })) : []
              } : undefined
            };
          });
        }
        return {
          id: org.id,
          name: org.name,
          pending: membership.pending,
          subscriptions: subs
        };
      }) || [];

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

  // Centralized currentPlan computed property
  const { plans } = usePlans();
  const currentPlan = computed(() => {
    const org = selectedOrganization.value;
    if (!org) return plans.value.find(p => p.id === 'free');
    const activeSub = org.subscriptions?.find(sub => sub.status === 'active');
    if (activeSub && activeSub.products) {
      // Return the product object as Plan
      return {
        id: activeSub.products.id,
        name: activeSub.products.name,
        description: activeSub.products.description ?? null,
        metadata: activeSub.products.metadata
      };
    }
    return plans.value.find(p => p.id === 'free');
  });

  return {
    memberships: readonly(memberships),
    selectedOrganization,
    isLoading: readonly(isLoading),
    refreshMemberships,
    initializeSession,
    setSelectedOrganization,
    currentPlan
  }
}
