<template>
  <div>
    <UAlert v-if="error" color="warning" variant="soft" :title="error.message" class="mb-4" />
    <div v-if="isPageLoading">
      <div class="flex flex-col gap-4">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-12 w-full" />
        </div>
      </div>
    </div>
    <div v-else>
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3>Billing information</h3>
            <UButton v-if="subscription" @click="manageSubscription" color="neutral" variant="outline" :loading="isManagingSubscription">
              Manage Subscription
            </UButton>
          </div>
        </template>

        <UAlert 
          v-if="subscription?.status === 'trialing'"
            color="info"
            variant="subtle"
            title="Heads up!"
            description="You will be charged when your trial ends."
            icon="tabler:terminal"
            class="mb-4"
          />

        <div class="flex items-top gap-4">
          <div class="flex-1 ml-3">
            <div class="grid grid-cols-3 gap-2 w-full mb-4">
              <div class="flex flex-col text-left">
                <h4>Plan</h4>
                <p class="text-sm text-muted">{{ subscription?.metadata?.product?.name || order?.metadata?.product?.name || 'Free' }}</p>
              </div>

              <div v-if="subscription" class="flex flex-col text-left">
                <h4>Status</h4>
                <div>
                  <UBadge v-if="subscription?.status === 'active'" color="success" variant="subtle">
                    ACTIVE
                  </UBadge>
                  <UBadge v-else-if="subscription?.status === 'trialing'" color="info" variant="subtle">
                    TRIAL
                  </UBadge>
                  <UBadge v-else-if="subscription?.status === 'past_due'" color="warning" variant="subtle">
                    PAST DUE
                  </UBadge>
                  <UBadge v-else-if="subscription?.status === 'canceled'" color="warning" variant="subtle">
                    CANCELLED
                  </UBadge>
                  <UBadge v-else-if="subscription?.status === 'unpaid'" color="warning" variant="subtle">
                    UNPAID
                  </UBadge>
                  <UBadge v-else color="warning" variant="subtle">
                    {{ subscription?.status }}
                  </UBadge>
                </div>                
              </div>

              <div v-if="order" class="flex flex-col text-left">
                <h4>{{ getPrimaryPrice(order.metadata as any)?.amount_type === 'free' ? 'Signed up' : 'Purchased' }}</h4>
                <p class="text-sm text-muted">{{ formatDate(order.created_at) }}</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 w-full" v-if="!isFree">
              <div v-if="subscription" class="flex flex-col text-left">
                <h4>Billing cycle</h4>
                <p v-if="isTrialing" class="text-sm text-muted">Trial ends {{ formatDate(subscription.current_period_end) }}</p>
                <p v-else class="text-sm text-muted">{{ formatDate(subscription.current_period_start) }} - {{ formatDate(subscription.current_period_end) }}</p>
              </div>

              <div v-if="isSeatBasedPlan" class="flex flex-col text-left">
                <h4>Team members</h4>
                <div>
                  <p class="text-sm text-muted mb-2">{{ seatUsage.used }} used / {{ seatUsage.total }} total</p>  
                </div>
                <div>
                  <UButton @click="purchaseMoreSeats" variant="outline" icon="tabler:plus" size="xs">Seats</UButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
    <div v-if="!isLifetimePlan">
      <ClientOnly>
      <UCard class="mt-4">
        <template #header>
          <p>Plans and pricing</p>
        </template>
      
        <BillingPricingTable v-if="products.length > 0"
          :plans="products as any"
          :selectedPlan="selectedPlan"
          :currentPlan="subscription?.metadata?.product?.id || order?.metadata?.product?.id"
          @update:selectedPlan="selectedPlan = $event"
        />

        <template #footer>
          <UButton 
          @click="subscribeToPlan" 
          :disabled="!isPlanChangeValid" 
          :loading="isCreatingCheckout"
          size="lg"          
        >
            Change plan
          </UButton>
        </template>
      </UCard>
      </ClientOnly>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import BillingPricingTable from '~/components/org/BillingPricingTable.vue';
import SeatPurchaseModal from '~/components/org/SeatPurchaseModal.vue';
import SeatTrialModal from '~/components/org/SeatTrialModal.vue';
import PlanDowngradeModal from '~/components/org/PlanDowngradeModal.vue';
import { usePolar } from '~/composables/usePolar';
import type { SubscriptionWithMetadata, OrderWithMetadata, Product } from '~~/server/db/schema';

const { selectedOrganization } = useMemberships()
const { $client } = useNuxtApp()
const { products, isLoading: productsLoading, fetchProducts, isSeatBased, isOneTime, isFree: isFreeFn, getSeatPrice, getPrimaryPrice, seatUsage, fetchSeatUsage, isTrialing: isTrialingFn } = usePolar();
const toast = useToast();
const overlay = useOverlay();

definePageMeta({
  layout: 'org',
})

const orgId = selectedOrganization.value?.id as string;
const subscription = computed((): SubscriptionWithMetadata | null => {
  const org = selectedOrganization.value;
  return org?.subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing') as SubscriptionWithMetadata || null;
});
const order = computed((): OrderWithMetadata | null => {
  const org = selectedOrganization.value;
  return org?.orders?.[0] as OrderWithMetadata || null;
});
const currentPlan = products.value.find(p => p.id === subscription.value?.metadata?.product?.id) as Product;

const isLoading = ref(false)
const error = ref<{ message: string } | null>(null);
const selectedPlan = ref<string | undefined>(undefined);
const isPageLoading = computed(() => isLoading.value || productsLoading.value);
const isCreatingCheckout = ref(false);
const isManagingSubscription = ref(false);
const pendingDowngradePlan = ref<Product | null>(null);

const isSeatBasedPlan = computed(() => isSeatBased(subscription.value?.metadata?.product as any) || seatUsage.value.isSeatBased);
const isLifetimePlan = computed(() => !!order.value && isOneTime(order.value.metadata?.product as any));
const isTrialing = computed(() => subscription ? isTrialingFn(subscription.value) : false );
const isFree = computed(() => isFreeFn(currentPlan as any));

const isPlanChangeValid = computed(() => {
  const currentPlanId = subscription.value?.metadata?.product?.id || order.value?.metadata?.product?.id;
  return selectedPlan.value && selectedPlan.value !== currentPlanId;
});

const isDowngrade = computed(() => {
  if (!selectedPlan.value || !subscription.value?.metadata?.product) return false;

  const targetPlan = products.value.find(p => p.id === selectedPlan.value) as Product;
  
  if (!currentPlan || !targetPlan) return false;
  
  const currentIsPaid = !isFree;
  const targetIsFree = isFreeFn(targetPlan);
  
  return currentIsPaid && targetIsFree;
});

// Helper functions
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const subscribeToPlan = async () => {
  if (!selectedPlan.value) return;
  
  const selected = products.value.find(p => p.id === selectedPlan.value) as Product;
  if (!selected) return;

  const currentPlanId = subscription.value?.metadata?.product?.id || order.value?.metadata?.product?.id;
  const { $posthog } = useNuxtApp();
  
  $posthog().capture('billing_plan_change_started', {
    from_plan: currentPlanId,
    to_plan: selected.id,
    org_id: orgId,
    is_downgrade: isDowngrade.value
  });

  if (isDowngrade.value) {
    pendingDowngradePlan.value = selected;
    showDowngradeModal();
    return;
  }

  const selectedIsFree = isFreeFn(selected as any);

  isCreatingCheckout.value = true;
  try {
    if (selectedIsFree) {
      await $client.organizations.switchToFreePlan.mutate({
        organizationId: selectedOrganization.value?.id as string,
        productId: selected.id,
      });
      
      $posthog().capture('billing_plan_changed', {
        from_plan: currentPlanId,
        to_plan: selected.id,
        org_id: orgId,
        plan_type: 'free'
      });
      
      toast.add({
        title: 'Plan Updated',
        description: 'Successfully switched to free plan.',
        color: 'success',
      });
      
      await refreshCookie('supabase-auth-token');
    } else {
      const mutationPayload: { organizationId: string; productId: string; seats?: number; plan_change: boolean; } = {
        organizationId: selectedOrganization.value?.id as string,
        productId: selected.id,
        plan_change: true,
      };

      if (isSeatBased(selected as any)) {
        mutationPayload.seats = Math.max(seatUsage.value.used, 1);
      }

      const { checkoutUrl } = await $client.organizations.createCheckoutSession.mutate(mutationPayload);
      $posthog().capture('checkout_initiated', {
        from_plan: currentPlanId,
        to_plan: selected.id,
        org_id: orgId,
        plan_change: true
      });
      window.location.href = checkoutUrl;
    }
  } catch (e) {
    console.error('Error changing plan:', e);
    $posthog().capture('billing_plan_change_failed', {
      from_plan: currentPlanId,
      to_plan: selected.id,
      error: (e as Error).message,
      org_id: orgId
    });
    error.value = { message: 'Failed to change plan. Please try again.' };
  } finally {
    isCreatingCheckout.value = false;
  }
};

const showDowngradeModal = async () => {
  const modal = overlay.create(PlanDowngradeModal, {
    props: {
      targetPlan: pendingDowngradePlan.value,
      currentSubscription: subscription.value,
      organizationId: orgId
    }
  });
  
  try {
    const result = await modal.open().result;
    if (result) {
      pendingDowngradePlan.value = null;
      await refreshCookie('supabase-auth-token');
    }
  } catch (e) {
    // Modal was closed/cancelled
    pendingDowngradePlan.value = null;
  }
};

onMounted(async () => {
  await fetchProducts()
  if (selectedOrganization.value?.id) {
    await fetchSeatUsage(selectedOrganization.value.id)
  }
  selectedPlan.value = subscription.value?.metadata?.product?.id || order.value?.metadata?.product?.id
})

const manageSubscription = async () => {
  isManagingSubscription.value = true;
  try {
    const { $posthog } = useNuxtApp();
    $posthog().capture('billing_portal_accessed', {
      org_id: selectedOrganization.value?.id,
      current_plan: subscription.value?.metadata?.product?.id
    });
    const { url } = await $client.organizations.createPortalSession.mutate({ organizationId: selectedOrganization.value?.id as string })
    window.location.href = url

  } catch (e) {
    console.error('Failed to get subscription management URL:', e)
    error.value = { message: 'Failed to get subscription management URL. See console for details.' };
  } finally {
    isManagingSubscription.value = false;
  }
}

const purchaseMoreSeats = async () => {
  if (!subscription.value?.metadata?.product) return;

  if (isTrialing) {
    const modal = overlay.create(SeatTrialModal);
    await modal.open().result;
    return;
  }

  const price = getSeatPrice(subscription.value.metadata.product as any);
  const p = getPrimaryPrice(subscription.value.metadata.product as any);
  const currency = (p as any)?.price_currency ?? 'usd';
  const billingPeriod = (p as any)?.recurring_interval ?? 'month';

  const modal = overlay.create(SeatPurchaseModal, {
    props: {
      organizationId: selectedOrganization.value?.id as string,
      currentSeats: seatUsage.value.total,
      pricePerSeat: price,
      currency: currency,
      billingPeriod: billingPeriod
    }
  });

  try {
    const result = await modal.open().result;
    if (result && selectedOrganization.value?.id) {
      await fetchSeatUsage(selectedOrganization.value.id);
    }
  } catch (e) {
    // Modal cancelled
  }
}
</script>