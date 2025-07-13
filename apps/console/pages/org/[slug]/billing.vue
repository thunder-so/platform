<template>
  <div>
    <div v-if="isLoading">Loading billing information...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else-if="subscription">
      <h3 class="text-lg font-medium mb-2">Current Subscription</h3>
      <div class="p-4 border rounded-md">
        <p><strong>Status:</strong> {{ subscription.status }}</p>
        <p><strong>Plan:</strong> {{ subscription.products?.name }}</p>
        <p><strong>Current Period:</strong> {{ new Date(subscription.current_period_start).toLocaleDateString() }} - {{ new Date(subscription.current_period_end).toLocaleDateString() }}</p>
        <p v-if="subscription.cancel_at_period_end">Subscription will be canceled at the end of the current period.</p>
        <UButton @click="manageSubscription" class="mt-4">Manage Subscription</UButton>
      </div>
    </div>
    <div v-else>
      <h2>You are on the free tier.</h2>
      <p>Upgrade to a Pro plan to unlock more features</p>
      <PricingTable
        :plans="plans"
        :selectedPlan="selectedPlan"
        @update:selectedPlan="selectedPlan = $event"
        @selectPlan="subscribeToPlan"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PricingTable from '~/components/PricingTable.vue';
const appConfig = useAppConfig();
const route = useRoute()
const supabase = useSupabaseClient()
const { $client } = useNuxtApp()

definePageMeta({
  layout: 'org',
})

const orgId = route.params.slug
const subscription = ref(null)
const isLoading = ref(false)
const error = ref(null)
const plans = ref(appConfig.plans);
const selectedPlan = ref(appConfig.plans.find(p => p.productId === null)?.id || null);

const subscribeToPlan = async (planId) => {
  const selected = plans.value.find(p => p.id === planId);
  if (!selected || !selected.productId) {
    console.error('Invalid plan selected or no product ID for the selected plan.');
    return;
  }

  try {
    const { checkoutUrl } = await $client.organizations.createCheckoutSession.mutate({
      organizationId: orgId,
      productId: selected.productId,
    });
    window.location.href = checkoutUrl;
  } catch (e) {
    console.error('Error creating checkout session:', e);
    alert('Failed to create checkout session. Please try again.');
  }
};

const fetchSubscription = async () => {
  isLoading.value = true
  error.value = null
  try {
    const { data, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        products (*)
      `)
      .eq('organization_id', orgId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'JSON object requested, multiple (or no) rows returned'
      throw fetchError
    } else if (fetchError && fetchError.code === 'PGRST116') {
      subscription.value = null; // No subscription found
    }
    subscription.value = data
  } catch (e) {
    error.value = e
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchSubscription()
})

const manageSubscription = async () => {
  try {
    // const response = await fetch(`/api/portal?organization_id=${orgId}`)
    // const data = await response.json()
    // if (response.ok) {
    //   window.location.href = data.url
    // } else {
    //   throw new Error(data.message || 'Failed to get portal URL')
    // }
    const { url } = await $client.organizations.createPortalSession.mutate({ organizationId: orgId })
    window.location.href = url

  } catch (e) {
    console.error('Failed to get subscription management URL:', e)
    alert('Failed to get subscription management URL. See console for details.')
  }
}
</script>