<template>
  <div>
    <Header />
    <div class="container">
      <div v-if="loading">Loading...</div>
      <div v-else-if="error">
        <h1>Payment Processing Error</h1>
        <p>{{ error.message }}</p>
        <p>Please contact support.</p>
      </div>
      <div v-else>
        <h1>Payment Successful!</h1>
        <p>Thank you for your payment. Your plan has been activated.</p>
        <p>You can now proceed to your organization's dashboard.</p>
        <NuxtLink :to="`/org/${organizationId}`" class="button">
          Go to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const { $client } = useNuxtApp()
const route = useRoute()

const organizationId = ref('')
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  const checkoutId = route.query.checkout_id

  if (!checkoutId) {
    error.value = { message: 'Missing checkout session ID.' }
    loading.value = false
    return
  }

  try {
    const org = await $client.organizations.verifyCheckout.query({ checkoutId })
    organizationId.value = org.organizationId
  } catch (e) {
    console.error('Error fetching organization by checkout ID:', e)
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.container {
  text-align: center;
  padding: 2rem;
}

.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  margin-top: 1.5rem;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: #0056b3;
}
</style>