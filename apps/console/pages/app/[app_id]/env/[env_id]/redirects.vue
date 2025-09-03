<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Redirect Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings">
        <div class="grid grid-cols-2 gap-4">
          <template v-for="(redirect, index) in formState.redirects" :key="`redirect-${index}`">
            <UFormField :label="`Source ${index + 1}`" :name="`redirect-source-${index}`">
              <UInput v-model="redirect.source" />
            </UFormField>
            <UFormField :label="`Destination ${index + 1}`" :name="`redirect-destination-${index}`">
              <UInput v-model="redirect.destination" />
            </UFormField>
            <div class="col-span-2">
              <UButton icon="i-heroicons-minus" color="info" @click="removeRedirect(index)">Remove Redirect</UButton>
            </div>
          </template>
          <div class="col-span-2">
            <UButton icon="i-heroicons-plus" @click="addRedirect">Add Redirect</UButton>
          </div>
        </div>

        <h2 class="text-xl font-semibold mb-4">Rewrite Settings</h2>

        <div class="grid grid-cols-2 gap-4">
          <template v-for="(rewrite, index) in formState.rewrites" :key="`rewrite-${index}`">
            <UFormField :label="`Source ${index + 1}`" :name="`rewrite-source-${index}`">
              <UInput v-model="rewrite.source" />
            </UFormField>
            <UFormField :label="`Destination ${index + 1}`" :name="`rewrite-destination-${index}`">
              <UInput v-model="rewrite.destination" />
            </UFormField>
            <div class="col-span-2">
              <UButton icon="i-heroicons-minus" color="info" @click="removeRewrite(index)">Remove Rewrite</UButton>
            </div>
          </template>
          <div class="col-span-2">
            <UButton icon="i-heroicons-plus" @click="addRewrite">Add Rewrite</UButton>
          </div>
        </div>

        <div class="mt-4">
          <UButton type="submit" :loading="isSaving">Save Settings</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0]);

const formState = ref({
  redirects: [] as { source: string; destination: string }[],
  rewrites: [] as { source: string; destination: string }[],
});

watch(service, (currentService) => {
  if (currentService?.stackType === 'SPA' && currentService.metadata) {
  formState.value.redirects = JSON.parse(JSON.stringify(currentService.metadata.redirects || []));
  formState.value.rewrites = JSON.parse(JSON.stringify(currentService.metadata.rewrites || []));
  } else {
    formState.value.redirects = [];
    formState.value.rewrites = [];
  }
}, { immediate: true, deep: true });

const isSaving = ref(false);

const addRedirect = () => {
  formState.value.redirects.push({ source: '', destination: '' });
};

const removeRedirect = (index: number) => {
  formState.value.redirects.splice(index, 1);
};

const addRewrite = () => {
  formState.value.rewrites.push({ source: '', destination: '' });
};

const removeRewrite = (index: number) => {
  formState.value.rewrites.splice(index, 1);
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    if (!service.value) {
      throw new Error('Service not found.');
    }

  //   await $client.services.updateServiceSpa.mutate({
  // service_id: service.value.id,
  //     redirects: formState.value.redirects,
  //     rewrites: formState.value.rewrites,
  //   });
    toast.add({ title: 'Edge settings saved successfully!', color: 'success' });
    await refreshApplicationSchema();
  } catch (e: any) {
    toast.add({ title: 'Error saving edge settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>
