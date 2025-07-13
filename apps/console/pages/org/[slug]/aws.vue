<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">AWS Accounts</h2>
      <UButton @click="addNewAccount">Add New</UButton>
    </div>

    <div v-if="loading">Loading AWS accounts...</div>
    <div v-else-if="error">Error loading AWS accounts: {{ error.message }}</div>
    <div v-else-if="providers.length">
      <UCard v-for="provider in providers" :key="provider.id" class="mb-4">
        <template #header>
          <h3>{{ provider.alias }}</h3>
        </template>
        <p><strong>Account ID:</strong> {{ provider.account_id }}</p>
        <p><strong>Region:</strong> {{ provider.region }}</p>
        <p><strong>Stack Name:</strong> {{ provider.stack_name }}</p>
        <p><strong>Status:</strong> {{ provider.status }}</p>
        <p><strong>Last Updated:</strong> {{ new Date(provider.updated_at).toLocaleString() }}</p>
      </UCard>
    </div>
    <div v-else>
      <p>No AWS accounts connected yet.</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'org'
})

const route = useRoute()
const supabase = useSupabaseClient()
const organization = inject('organization')
const config = useRuntimeConfig()
const providers = ref([])
const loading = ref(false)
const error = ref(null)

const orgId = route.params.slug

const addNewAccount = () => {
  const roleTemplateUrl = useRuntimeConfig().public.PROVIDER_STACK;
  const url = `https://us-east-1.console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=${encodeURIComponent(roleTemplateUrl)}&stackName=thunder-provider-${encodeURIComponent()}&param_Alias=${encodeURIComponent()}&param_ProviderId=${encodeURIComponent()}`;

  window.open(url, '_blank');
};

const fetchProviders = async () => {
  loading.value = true
  try {
    const { data, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('organization_id', organization.value.id)

    if (fetchError) throw fetchError
    providers.value = data
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (organization.value) {
    fetchProviders()

    // Realtime subscription
    supabase
      .channel(`organization_providers:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'providers', filter: `organization_id=eq.${orgId}` }, payload => {
        console.log('Change received!', payload)
        fetchProviders() // Re-fetch providers on any change
      })
      .subscribe()
  }
})

onUnmounted(() => {
  // Unsubscribe from realtime channel when component is unmounted
  supabase.removeChannel(`organization_providers:${orgId}`)
})

// Watch for organization data to be available
watch(organization, (newOrg) => {
  if (newOrg) {
    fetchProviders()
  }
})
</script>
