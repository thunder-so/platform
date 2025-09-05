<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h3>Redirects and Rewrites</h3>
      </template>

      <h2 class="text-md font-semibold mb-4 pb-4 border-b border-muted">Redirects</h2>

      <UForm :state="formState" @submit="saveSettings">
        <div v-for="(redirect, index) in formState.redirects" :key="`redirect-${index}`" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
          <UFormField :name="`redirect-source-${index}`" class="col-span-4">
            <UInput 
              v-model="redirect.source" 
              placeholder="Source path"
              class="w-full" 
            />
          </UFormField>
          <UFormField :name="`redirect-destination-${index}`" class="col-span-4">
            <UInput 
              v-model="redirect.destination" 
              placeholder="Destination path"
              class="w-full" 
            />
          </UFormField>
          <div class="col-span-1">
            <UButton icon="heroicons:trash" color="error" variant="ghost" @click="removeRedirect(index)" />
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addRedirect">Add Redirect</UButton>

        <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Rewrites</h2>

        <div v-for="(rewrite, index) in formState.rewrites" :key="`rewrite-${index}`" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
          <UFormField :name="`rewrite-source-${index}`" class="col-span-4">
            <UInput 
              v-model="rewrite.source" 
              placeholder="Source path"
              class="w-full" 
            />
          </UFormField>
          <UFormField :name="`rewrite-destination-${index}`" class="col-span-4">
            <UInput 
              v-model="rewrite.destination" 
              placeholder="Destination path"
              class="w-full" 
            />
          </UFormField>
          <div class="col-span-1">
            <UButton icon="heroicons:trash" color="error" variant="ghost" @click="removeRewrite(index)" />
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addRewrite">Add Rewrite</UButton>
      </UForm>

      <template #footer>
        <UButton :loading="isSaving" color="primary" @click="saveSettings">Save Settings</UButton>
      </template>
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
