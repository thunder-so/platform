<template>
  <UCard v-if="!service">
    <template #header>
      <USkeleton class="h-6 w-40" />
    </template>
    <USkeleton class="h-6 w-full" />
    <template #footer>
      <USkeleton class="h-8 w-40" />
    </template>
  </UCard>
  
  <UCard v-else-if="service.stack_type === 'SPA'">
    <template #header>
      <h2>Custom HTTP Headers</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage custom headers for your service.
      </p>
    </template>

    <UForm v-if="state" :schema="SPAServiceMetadataSchema" :state="state" class="space-y-4" ref="form" :validate-on="['blur']">
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
          <UButton icon="tabler:trash" color="error" variant="ghost" @click="removeHeader(index)" />
        </div>
      </div>

      <UButton color="primary" variant="outline" icon="tabler:plus" @click="addHeader">
        Add Header
      </UButton>
    </UForm>
    <template #footer>
      <div class="flex gap-2">
        <UButton type="submit" :loading="isSaving" :disabled="!isDirty" @click="() => saveAndRebuild(() => saveHeaders(), 'Headers updated.')">
          Save and Rebuild
        </UButton>
        <UButton type="submit" :loading="isSaving" :disabled="!isDirty" @click="() => saveOnly(() => saveHeaders(), 'Headers updated.')" color="neutral" variant="outline">
          Save
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { isEqual } from 'lodash-es';
import type { Form } from '#ui/types';
import { type SPAServiceMetadata, SPAServiceMetadataSchema } from '~~/server/validators/common';
import { useNavigationGuard } from '~/composables/useNavigationGuard';

definePageMeta({
  layout: 'app'
});

const { currentService: service, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();
const { isSaving, saveOnly, saveAndRebuild } = useSaveAndRebuild();

const form = ref<Form<SPAServiceMetadata> | null>(null);
const state = ref<SPAServiceMetadata | null>(null);
const isDirty = ref(false);

useNavigationGuard(isDirty);

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

const saveHeaders = async () => {
  if (!service.value || !state.value || !form.value) return;
  
  await form.value.validate();
  await $client.services.updateServiceMetadata.mutate({
    service_id: service.value.id,
    stack_type: 'SPA',
    metadata: state.value
  });
  isDirty.value = false;
};
</script>
