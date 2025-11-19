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
            <UButton v-if="subscription" @click="manageSubscription" color="neutral" variant="outline">
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
            icon="i-lucide-terminal"
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
                <h4>Purchased</h4>
                <p class="text-sm text-muted">{{ formatDate(order.created_at) }}</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 w-full">
              <div v-if="subscription" class="flex flex-col text-left">
                <h4>Billing cycle</h4>
                <p class="text-sm text-muted">{{ formatDate(subscription.current_period_start) }} - {{ formatDate(subscription.current_period_end) }}</p>
              </div>

              <div v-if="isSeatBasedPlan" class="flex flex-col text-left">
                <div>
                  <h4>Seats</h4>
                  <p class="text-sm text-muted mb-2">{{ seatUsage.used }} / {{ seatUsage.total }}</p>
                  <!-- <UButton @click="purchaseMoreSeats" variant="outline">Purchase More Seats</UButton>   -->
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
      
        <BillingPricingTable v-if="plans.length > 0"
          :plans="plans"
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
import { usePlans } from '~/composables/usePlans';
import type { Subscription, Order, Price, ProductMetadata } from '~~/server/db/schema';

type SubscriptionWithMetadata = Subscription & {
  metadata?: {
    price?: Price;
    product?: ProductMetadata;
  };
};

type OrderWithMetadata = Order & {
  metadata?: {
    price?: Price;
    product?: ProductMetadata;
  };
};

const route = useRoute()
const supabase = useSupabaseClient()
const { selectedOrganization } = useMemberships()
const { $client } = useNuxtApp()
const { plans, isLoading: plansLoading, fetchPlans } = usePlans();
const toast = useToast();

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
const isLoading = ref(false)
const error = ref<{ message: string } | null>(null);
const selectedPlan = ref<string | undefined>(undefined);
const isPageLoading = computed(() => isLoading.value || plansLoading.value);
const isCreatingCheckout = ref(false);

const isSeatBasedPlan = computed(() => {
  if (!subscription.value?.metadata) return false;
  return subscription.value.metadata.price?.amount_type === 'seat_based';
});

const isLifetimePlan = computed(() => {
  return !!order.value && order.value.metadata?.product?.prices?.[0]?.type === 'one_time';
});

const isPlanChangeValid = computed(() => {
  const currentPlanId = subscription.value?.metadata?.product?.id || order.value?.metadata?.product?.id;
  return selectedPlan.value && selectedPlan.value !== currentPlanId;
});

const seatUsage = ref({ used: 0, total: 0 });

// Helper functions
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fetchSeatUsage = async () => {
  if (!subscription.value || !isSeatBasedPlan.value) return;
  
  try {
    const usage = await $client.team.getSeatUsage.query({ organizationId: orgId });
    seatUsage.value = usage;
  } catch (e) {
    console.error('Error fetching seat usage:', e);
  }
};

const subscribeToPlan = async () => {
  if (!selectedPlan.value) {
    console.error('No plan selected.');
    return;
  }
  const selected = plans.value.find(p => p.id === selectedPlan.value);
  if (!selected) {
    console.error('Invalid plan selected.');
    return;
  }

  isCreatingCheckout.value = true;
  try {
    const mutationPayload: { organizationId: string; productId: string; seats?: number; plan_change: boolean; } = {
      organizationId: orgId as string,
      productId: selected.id,
      plan_change: true,
    };

    if (selected.metadata?.prices?.[0]?.amount_type === 'seat_based') {
      mutationPayload.seats = Math.max(seatUsage.value.used, 1);
    }

    const { checkoutUrl } = await $client.organizations.createCheckoutSession.mutate(mutationPayload);
    window.location.href = checkoutUrl;
  } catch (e) {
    console.error('Error creating checkout session:', e);
    error.value = { message: 'Failed to create checkout session. Please try again.' };
  } finally {
    isCreatingCheckout.value = false;
  }
};

onMounted(async () => {
  await fetchPlans()
  await fetchSeatUsage()
  selectedPlan.value = subscription.value?.metadata?.product?.id || order.value?.metadata?.product?.id
})

const manageSubscription = async () => {
  try {
    const { url } = await $client.organizations.createPortalSession.mutate({ organizationId: orgId })
    window.location.href = url

  } catch (e) {
    console.error('Failed to get subscription management URL:', e)
    error.value = { message: 'Failed to get subscription management URL. See console for details.' };
  }
}

const purchaseMoreSeats = async () => {
  try {
    const result = await $client.team.purchaseSeats.mutate({ 
      organizationId: orgId, 
      additionalSeats: 1 
    });
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  } catch (e) {
    console.error('Failed to purchase seats:', e);
    error.value = { message: 'Failed to purchase additional seats.' };
  }
}
</script>