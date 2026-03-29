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
  <UCard v-else-if="service.stack_type === 'STATIC'">
    <template #header>
      <h2>Redirects & Rewrites</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage redirects and rewrites for your service.
      </p>
    </template>

    <UForm v-if="state" :schema="CloudFrontMetadataSchema" :state="state" class="space-y-8" ref="form" :validate-on="['blur']">
      <!-- REDIRECTS -->
      <div>
        <h3 class="text-md font-medium text-gray-900 dark:text-white">Redirects</h3>
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
              <UButton icon="tabler:trash" color="error" variant="ghost" @click="removeRedirect(index)" />
            </div>
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="tabler:plus" @click="addRedirect" class="mt-4">
          Add Redirect
        </UButton>
      </div>

      <!-- REWRITES -->
      <div>
        <h3 class="text-md font-medium text-gray-900 dark:text-white">Rewrites</h3>
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
              <UButton icon="tabler:trash" color="error" variant="ghost" @click="removeRewrite(index)" />
            </div>
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="tabler:circle-plus" @click="addRewrite" class="mt-4">
          Add Rewrite
        </UButton>
      </div>
    </UForm>
    <template #footer>
      <div class="flex gap-2">
        <UButton type="submit" :loading="isSaving" :disabled="!isDirty" @click="() => saveAndRebuild(() => saveMetadata(), 'Redirects updated.')">
          Save and Rebuild
        </UButton>
        <UButton type="submit" :loading="isSaving" :disabled="!isDirty" @click="() => saveOnly(() => saveMetadata(), 'Redirects updated.')" color="neutral" variant="outline">
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
import { type CloudFrontMetadata, CloudFrontMetadataSchema } from '~~/server/validators/common';
import { useNavigationGuard } from '~/composables/useNavigationGuard';

definePageMeta({
  layout: 'app'
});

const { currentService: service, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();
const { isSaving, saveOnly, saveAndRebuild } = useSaveAndRebuild();

const state = ref<CloudFrontMetadata | null>(null);
const isDirty = ref(false);
const form = ref<Form<CloudFrontMetadata> | null>(null);

useNavigationGuard(isDirty);

watch(service, (newVal) => {
  if (newVal && newVal.stack_type === 'STATIC') {
    const metadata = {
      ...newVal.cloudfront_metadata,
      redirects: newVal.cloudfront_metadata?.redirects || [],
      rewrites: newVal.cloudfront_metadata?.rewrites || [],
    };
    state.value = JSON.parse(JSON.stringify(metadata));

    watch(state, (newState) => {
      const originalMetadata = {
        ...newVal.cloudfront_metadata,
        redirects: newVal.cloudfront_metadata?.redirects || [],
        rewrites: newVal.cloudfront_metadata?.rewrites || [],
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

const saveMetadata = async () => {
  if (!service.value || !state.value || !form.value) return;
  
  await form.value.validate();
  await $client.services.updateServiceCloudfrontMetadata.mutate({
    service_id: service.value.id,
    cloudfront_metadata: state.value
  });
  isDirty.value = false;
};
</script>