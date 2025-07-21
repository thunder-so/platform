<template>
  <div>
    <h2>Select an AWS Provider</h2>
    <div v-if="pending">Loading providers...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else-if="providers.length === 0">
      <p>No AWS providers found for this organization. Please add one.</p>
      <!-- TODO: Add a link or button to add a new provider -->
    </div>
    <div v-else>
      <ul>
        <li
          v-for="provider in providers"
          :key="provider.id"
          @click="selectProvider(provider.id)"
          :class="{ 'selected': selectedProviderId === provider.id }"
        >
          {{ provider.alias }} ({{ provider.accountId }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import { trpc } from '~/plugins/trpc.client';

const { selectedProviderId, setProviderId, organizationId } = useNewApplicationFlow();

const providers = ref<any[]>([]);
const pending = ref(true);
const error = ref<Error | null>(null);

const fetchProviders = async () => {
  if (!organizationId.value) {
    // Do not fetch if organizationId is not yet available
    return;
  }
  try {
    pending.value = true;
    error.value = null;
    const result = await trpc.providers.getProvidersByOrganizationId.query({ organizationId: organizationId.value });
    providers.value = result;
  } catch (e) {
    error.value = e as Error;
    console.error('Error fetching providers:', e);
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  // Fetch providers if organizationId is already available on mount
  fetchProviders();
});

// Watch for changes in organizationId and refetch providers
watch(organizationId, (newOrgId) => {
  if (newOrgId) {
    fetchProviders();
  }
});

const selectProvider = (providerId: string) => {
  setProviderId(providerId);
};
</script>

<style scoped>
.selected {
  background-color: #e0e0e0;
}
</style>
