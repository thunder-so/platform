<template>
  <UCard v-if="service && service.stack_type === 'SPA'">
    <template #header>
      <h2 class="font-semibold text-xl text-gray-900 dark:text-white leading-tight">
        Redirects & Rewrites
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage redirects and rewrites for your service.
      </p>
    </template>

    <UForm v-if="state" :schema="SPAServiceMetadataSchema" :state="state" class="space-y-8" @submit="onSubmit" ref="form">
      <!-- REDIRECTS -->
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Redirects</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Permanent (301) or temporary (302) redirects.</p>
        <div class="mt-4 space-y-3">
          <div v-for="(redirect, index) in state.redirects" :key="index" class="grid grid-cols-12 gap-x-2 items-start">
            <UFormField :name="`redirects.${index}.source`" class="col-span-5">
              <UInput v-model="redirect.source" placeholder="Source Path (e.g., /old-path)" class="w-full" />
            </UFormField>
            <UFormField :name="`redirects.${index}.destination`" class="col-span-5">
              <UInput v-model="redirect.destination" placeholder="Destination URL (e.g., /new-path)" class="w-full" />
            </UFormField>
            <div class="col-span-1">
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" @click="removeRedirect(index)" />
            </div>
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" @click="addRedirect" class="mt-4">
          Add Redirect
        </UButton>
      </div>

      <!-- REWRITES -->
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Rewrites</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Rewrite a path to another path without changing the URL.</p>
        <div class="mt-4 space-y-3">
          <div v-for="(rewrite, index) in state.rewrites" :key="index" class="grid grid-cols-12 gap-x-2 items-start">
            <UFormField :name="`rewrites.${index}.source`" class="col-span-5">
              <UInput v-model="rewrite.source" placeholder="Source Path (e.g., /api/*)" class="w-full" />
            </UFormField>
            <UFormField :name="`rewrites.${index}.destination`" class="col-span-5">
              <UInput v-model="rewrite.destination" placeholder="Destination Path (e.g., /index.html)" class="w-full" />
            </UFormField>
            <div class="col-span-1">
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" @click="removeRewrite(index)" />
            </div>
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" @click="addRewrite" class="mt-4">
          Add Rewrite
        </UButton>
      </div>
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
const form = ref();

watch(service, (newVal) => {
  if (newVal && newVal.stack_type === 'SPA') {
    const metadata = {
      ...newVal.metadata,
      redirects: newVal.metadata?.redirects || [],
      rewrites: newVal.metadata?.rewrites || [],
    };
    state.value = JSON.parse(JSON.stringify(metadata));

    watch(state, (newState) => {
      const originalMetadata = {
        ...newVal.metadata,
        redirects: newVal.metadata?.redirects || [],
        rewrites: newVal.metadata?.rewrites || [],
      };
      isDirty.value = !isEqual(originalMetadata, newState);
    }, { deep: true });
  }
}, { immediate: true });

const addRedirect = () => {
  if (state.value) {
    state.value.redirects.push({ source: '', destination: '' });
  }
};

const removeRedirect = (index: number) => {
  if (state.value) {
    state.value.redirects.splice(index, 1);
  }
};

const addRewrite = () => {
  if (state.value) {
    state.value.rewrites.push({ source: '', destination: '' });
  }
};

const removeRewrite = (index: number) => {
  if (state.value) {
    state.value.rewrites.splice(index, 1);
  }
};

const handleSave = () => {
  form.value?.submit();
};

async function onSubmit(event: FormSubmitEvent<SPAServiceMetadata>) {
  if (!service.value) return;
  isLoading.value = true;
  try {
    await $client.services.updateServiceMetadata.mutate({
      service_id: service.value.id,
      stack_type: 'SPA',
      metadata: event.data
    });
    toast.add({ title: 'Settings updated successfully!', color: 'success' });
    await refreshApplicationSchema();
    isDirty.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    toast.add({ title: 'Failed to update settings', description: message, color: 'warning' });
  } finally {
    isLoading.value = false;
  }
}
</script>