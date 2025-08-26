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
    <div v-else-if="subscription">
      <UCard>
        <template #header>
          <h3>Current Subscription</h3>
        </template>
        
        <p><strong>Status:</strong> {{ subscription.status }}</p>
        <p><strong>Plan:</strong> {{ subscription.products?.name }}</p>
        <p><strong>Current Period:</strong> {{ new Date(subscription.current_period_start).toLocaleDateString() }} - {{ new Date(subscription.current_period_end).toLocaleDateString() }}</p>
        <p v-if="subscription.cancel_at_period_end">Subscription will be canceled at the end of the current period.</p>
        <UButton @click="manageSubscription" class="mt-4">Manage Subscription</UButton>
      </UCard>
    </div>
    <div v-else>
      <ClientOnly>
      <UCard>
        <template #header>
          <p>Subscription</p>
        </template>

        <p>This workspace is on the hobby plan.</p>
      </UCard>
      <UCard class="mt-4">
        <template #header>
          <p>Upgrade to a Pro plan</p>
        </template>
      
        <PricingTable v-if="paidPlans.length > 0"
          :plans="paidPlans"
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
import type { Product } from '~/server/db/schema';

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
const subscription = ref(null)
const isLoading = ref(true)
const error = ref<{ message: string } | null>(null);
const selectedPlan = ref<string | undefined>(undefined);
const isPageLoading = computed(() => isLoading.value || plansLoading.value);
const isCreatingCheckout = ref(false);
const paidPlans = computed<Product[]>(() => plans.value.filter(p => p.id !== 'free'));

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

const fetchSubscription = async () => {
  error.value = null
  try {
    const { data, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        products (*)
      `)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }
    subscription.value = data
  } catch (e) {
    error.value = { message: (e as Error).message || 'Error fetching subscriptions.' };
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchPlans()
  fetchSubscription()
  selectedPlan.value = paidPlans.value[0]?.id
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
</script>