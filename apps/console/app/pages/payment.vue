<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-sm text-muted">Loading...</div>
      </div>
    </div>
    
    <div v-else-if="error">
      <UAlert color="error" variant="soft" title="Payment Processing Error" :description="error.message" />
      <p class="mt-4 mb-4">Please contact support.</p>
      <UButton to="/">Go to Dashboard</UButton>
    </div>
    
    <div v-else>
      <UCard>
        <template #header>
          <div class="flex items-center gap-4">
            <UIcon name="lucide:circle-check" class="w-6 h-6 text-green-500" />
            <h1>Payment Successful</h1>
          </div>
        </template>
        
        <p class="mb-4">Thank you for your payment. Your plan has been activated.</p>
        <p class="mb-4">You can now proceed to your organization's dashboard.</p>
        <UButton :to="`/org/${organizationId}`">Go to Dashboard</UButton>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'blank',
});

const { $client } = useNuxtApp()
const route = useRoute()

const organizationId = ref('')
const loading = ref(true)
const error = ref<{ message: string } | null>(null);

onMounted(async () => {
  const checkoutId = route.query.checkout_id

  if (!checkoutId) {
    error.value = { message: 'Missing checkout session ID.' }
    loading.value = false
    return
  }

  try {
    const org = await $client.organizations.verifyCheckout.query({ checkoutId: checkoutId as string })
    organizationId.value = org.organizationId
    
    const { $posthog } = useNuxtApp();
    $posthog().capture('payment_completed', {
      checkout_id: checkoutId,
      org_id: org.organizationId
    });
  } catch (e) {
    console.error('Error fetching organization by checkout ID:', e);
    const { $posthog } = useNuxtApp();
    $posthog().capture('payment_verification_failed', {
      checkout_id: checkoutId,
      error: (e as Error).message
    });
    error.value = { message: (e as Error).message || 'Error fetching organization by checkout ID' };
  } finally {
    loading.value = false
  }
})
</script>