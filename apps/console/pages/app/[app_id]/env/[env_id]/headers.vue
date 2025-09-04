<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h3>Custom HTTP Headers</h3>
      </template>

      <UForm :state="formState" @submit="saveSettings" ref="form">
        <div v-for="(header, index) in formState.headers" :key="index" class="grid grid-cols-12 gap-x-2 mt-2 items-start">
          <UFormField :name="`headers.${index}.path`" class="col-span-3">
            <UInput
              v-model="header.path"
              placeholder="Path"
              class="w-full"
            />
          </UFormField>
          <UFormField :name="`headers.${index}.name`" class="col-span-4">
            <UInput
              v-model="header.name"
              placeholder="Name"
              class="w-full"
            />
          </UFormField>
          <UFormField :name="`headers.${index}.value`" class="col-span-4">
            <UInput
              v-model="header.value"
              placeholder="Value"
              class="w-full"
            />
          </UFormField>
          <div class="col-span-1">
            <UButton icon="i-heroicons-trash" color="error" variant="ghost" @click="removeHeader(index)" />
          </div>
        </div>
        <div class="col-span-2">
          <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addHeader">Add Header</UButton>
        </div>
      </UForm>
      <template #footer>
        <div class="flex justify-start">
          <UButton
            size="lg"
            :loading="isSaving"
            @click="submitForm"
          >
            Save and Rebuild
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FormSubmitEvent } from '#ui/types';

definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0]);

const formState = ref({
  headers: [] as { path: string; name: string; value: string }[],
});

watch(service, (currentService) => {
  if (currentService?.stack_type === 'SPA' && currentService.metadata?.headers) {
    formState.value.headers = JSON.parse(JSON.stringify(currentService.metadata.headers));
  } else {
    formState.value.headers = [];
  }
}, { immediate: true, deep: true });

const isSaving = ref(false);
const form = ref<HTMLFormElement | null>(null)

const addHeader = () => {
  formState.value.headers.push({ path: '', name: '', value: '' });
};

const removeHeader = (index: number) => {
  formState.value.headers.splice(index, 1);
};

const submitForm = () => {
  form.value?.submit()
}

const saveSettings = async (event: FormSubmitEvent<{ headers: { path: string; name: string; value: string }[] }>) => {
  isSaving.value = true;
  try {
    if (!service.value || service.value.stack_type !== 'SPA') {
      throw new Error('SPA service not found.');
    }

    const updatedMetadata = {
      ...service.value.metadata,
      headers: event.data.headers,
    };

    await $client.services.updateServiceMetadata.mutate({
      service_id: service.value.id,
      stack_type: service.value.stack_type,
      metadata: updatedMetadata,
    });
    toast.add({ title: 'Application headers updated', color: 'success' });
    await refreshApplicationSchema();
  } catch (e: any) {
    toast.add({ title: 'Error saving header settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>