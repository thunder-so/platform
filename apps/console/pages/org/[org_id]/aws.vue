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

    <UCard class="mb-4">
      <template #header>
        <h3>Manually Add AWS Account</h3>
      </template>
      <UForm :state="manualFormState" @submit="submitManualForm" class="space-y-4">
        <UFormField label="Alias" name="alias">
          <UInput v-model="manualFormState.alias" />
        </UFormField>
        <UFormField label="Access Key ID" name="accessKeyId">
          <UInput v-model="manualFormState.accessKeyId" />
        </UFormField>
        <UFormField label="Secret Access Key" name="secretAccessKey">
          <UInput v-model="manualFormState.secretAccessKey" type="password" />
        </UFormField>
        <UButton type="submit" :loading="manualFormLoading">Add Account</UButton>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { memberships, selectedOrganization, isLoading, refreshMemberships } = useMemberships()

definePageMeta({
  layout: 'org'
})

const { $client } = useNuxtApp()
const route = useRoute()
const supabase = useSupabaseClient()
// const organization = inject('organization')
const config = useRuntimeConfig()
const providers = ref([])
const loading = ref(false)
const error = ref(null)

const orgId = route.params.org_id

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
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (fetchError) throw fetchError
    providers.value = data
  } catch (e: any) {
    error.value = e
  } finally {
    loading.value = false
  }
}

const manualFormState = ref({
  alias: '',
  accessKeyId: '',
  secretAccessKey: '',
});
const manualFormLoading = ref(false);

const submitManualForm = async () => {
  manualFormLoading.value = true;
  try {
    await $client.providers.addManualProvider.mutate({
      organizationId: selectedOrganization.value?.id as string,
      ...manualFormState.value,
    });
    alert('AWS Account added successfully!');
    manualFormState.value = { alias: '', accessKeyId: '', secretAccessKey: '' }; // Clear form
    fetchProviders(); // Re-fetch providers to update the list
  } catch (e) {
    console.error('Error adding manual provider:', e);
    alert(`Failed to add AWS Account: ${e.message}`);
  } finally {
    manualFormLoading.value = false;
  }
};

onMounted(() => {
  if (selectedOrganization.value) {
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
  supabase.removeAllChannels()
})

// Watch for organization data to be available
// watch(organization, (newOrg) => {
//   if (newOrg) {
//     fetchProviders()
//   }
// })
</script>
