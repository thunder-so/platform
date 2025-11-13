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
          <h3>{{ subscription ? 'Current subscription' : 'Lifetime purchase' }}</h3>
        </template>
        
        <div v-if="subscription">
          <p><strong>Status:</strong> {{ subscription.status }}</p>
          <p><strong>Plan:</strong> {{ subscription.metadata?.product?.name }}</p>
          <p v-if="isSeatBasedPlan"><strong>Seats:</strong> {{ seatUsage.used }} of {{ seatUsage.total }} used</p>
          <p><strong>Current Period:</strong> {{ new Date(subscription.current_period_start).toLocaleDateString() }} - {{ new Date(subscription.current_period_end).toLocaleDateString() }}</p>
          <p v-if="subscription.cancel_at_period_end">Subscription will be canceled at the end of the current period.</p>
          
          <div class="flex gap-2 mt-4">
            <UButton @click="manageSubscription">Manage Subscription</UButton>
            <UButton v-if="isSeatBasedPlan" @click="purchaseMoreSeats" variant="outline">Purchase More Seats</UButton>
          </div>
        </div>
        
        <div v-else-if="order">
          <p><strong>Plan:</strong> Lifetime</p>
          <p><strong>Purchased:</strong> {{ new Date(order.created_at).toLocaleDateString() }}</p>
          <p><strong>Status:</strong> Active (Lifetime)</p>
          <p>You have unlimited access to all features.</p>
        </div>
      </UCard>
    </div>
    <div>
      <ClientOnly>
      <UCard class="mt-4">
        <template #header>
          <p>Plans and pricing</p>
        </template>
      
        <PricingTable v-if="plans.length > 0"
          :plans="plans"
          :selectedPlan="selectedPlan"
          @update:selectedPlan="selectedPlan = $event"
        />

        <template #footer>
          <UButton 
          @click="subscribeToPlan" 
          :disabled="!selectedPlan" 
          :loading="isCreatingCheckout"
          size="lg"
        >
            Upgrade to Pro
          </UButton>
        </template>
      </UCard>
      </ClientOnly>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import PricingTable from '~/components/org/PricingTable.vue';
import { usePlans } from '~/composables/usePlans';
import type { Subscription, Order, Price, ProductMetadata } from '~~/server/db/schema';

type SubscriptionWithMetadata = Subscription & {
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
const subscription = computed(() => {
  const org = selectedOrganization.value;
  return org?.subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing') || null;
});
const order = computed(() => {
  const org = selectedOrganization.value;
  return org?.orders?.[0] || null;
});
const isLoading = ref(false)
const error = ref<{ message: string } | null>(null);
const selectedPlan = ref<string | undefined>(undefined);
const isPageLoading = computed(() => isLoading.value || plansLoading.value);
const isCreatingCheckout = ref(false);

const isSeatBasedPlan = computed(() => {
  return subscription.value?.metadata?.price?.amount_type === 'seat_based';
});

const seatUsage = ref({ used: 0, total: 0 });

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
    const { checkoutUrl } = await $client.organizations.createCheckoutSession.mutate({
      organizationId: orgId as string,
      productId: selected.id,
    });
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
  selectedPlan.value = subscription.value?.metadata?.product?.id || order.value?.metadata?.product?.id || plans.value[0]?.id
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