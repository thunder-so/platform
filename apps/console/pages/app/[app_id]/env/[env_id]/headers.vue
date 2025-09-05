<template>
  <UCard v-if="service && service.stack_type === 'SPA'">
    <template #header>
      <h2 class="font-semibold text-xl text-gray-900 dark:text-white leading-tight">
        Headers
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage custom headers for your service.
      </p>
    </template>

    <UForm v-if="state" :schema="SPAServiceMetadataSchema" :state="state" class="space-y-4" ref="form" :validate-on="['input']">
      <div v-for="(header, index) in state.headers" :key="index" class="grid grid-cols-12 gap-x-2 items-start">
        <UFormField :name="`headers.${index}.path`" class="col-span-3">
          <UInput v-model="header.path" placeholder="Path Pattern (e.g., /*)" class="w-full" />
        </UFormField>
        <UFormField :name="`headers.${index}.name`" class="col-span-4">
          <UInput v-model="header.name" placeholder="Header Name (e.g., X-Frame-Options)" class="w-full" />
        </UFormField>
        <UFormField :name="`headers.${index}.value`" class="col-span-4">
          <UInput v-model="header.value" placeholder="Header Value (e.g., SAMEORIGIN)" class="w-full" />
        </UFormField>
        <div class="col-span-1">
          <UButton icon="i-heroicons-trash" color="error" variant="ghost" @click="removeHeader(index)" />
        </div>
      </div>

      <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" @click="addHeader">
        Add Header
      </UButton>
    </UForm>
    <template #footer>
      <UButton type="submit" :loading="isLoading" :disabled="!isDirty" @click="handleSave">
        Save Changes
      </UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { isEqual } from 'lodash-es';
import type { FormSubmitEvent } from '#ui/types';
import { type SPAServiceMetadata, SPAServiceMetadataSchema } from '~/server/validators/common';

definePageMeta({
  layout: 'app'
});

const { currentService: service, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();

const state = ref<SPAServiceMetadata | null>(null);
const isLoading = ref(false);
const isDirty = ref(false);

watch(service, (newVal) => {
  if (newVal && newVal.stack_type === 'SPA') {
    // Ensure headers is an array
    const metadata = { ...newVal.metadata, headers: newVal.metadata?.headers || [] };
    state.value = JSON.parse(JSON.stringify(metadata));

    // Begin watching for changes only after state is initialized
    watch(state, (newState) => {
      const originalMetadata = { ...newVal.metadata, headers: newVal.metadata?.headers || [] };
      isDirty.value = !isEqual(originalMetadata, newState);
    }, { deep: true });
  }
}, { immediate: true });

const addHeader = () => {
  if (state.value) {
    if (!state.value.headers) {
      state.value.headers = [];
    }
    state.value.headers.push({ path: '', name: '', value: '' });
  }
};

const removeHeader = (index: number) => {
  if (state.value && state.value.headers) {
    state.value.headers.splice(index, 1);
  }
};

async function handleSave() {
  if (!service.value || !state.value) return;
  isLoading.value = true;
  try {
    await $client.services.updateServiceMetadata.mutate({
      service_id: service.value.id,
      stack_type: 'SPA',
      metadata: state.value
    });
    toast.add({ title: 'Headers updated successfully!', color: 'success' });
    await refreshApplicationSchema();
    isDirty.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    toast.add({ title: 'Failed to update headers', description: message, color: 'warning' });
  } finally {
    isLoading.value = false;
  }
}
</script>
