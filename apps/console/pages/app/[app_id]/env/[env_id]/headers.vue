<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h3>Custom HTTP Headers</h3>
      </template>

      <UForm :state="formState" :schema="headersSchema" @submit="saveSettings" ref="form">
        <div v-for="(header, index) in formState.headers" :key="index" class="grid grid-cols-12 gap-x-2 mt-2 items-start">
          <UFormField label="Path" :name="`headers.${index}.path`" class="col-span-3">
            <UInput
              v-model="header.path"
              placeholder="Path"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Name" :name="`headers.${index}.name`" class="col-span-4">
            <UInput
              v-model="header.name"
              placeholder="Name"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Value" :name="`headers.${index}.value`" class="col-span-4">
            <UInput
              v-model="header.value"
              placeholder="Value"
              class="w-full"
            />
          </UFormField>
          <div class="col-span-1 pt-6">
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
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types'
import { headersSchema } from '~/server/db/types';

definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();

if (!applicationSchema.value) {
  throw Error('Application schema not found.')
}

const environment = applicationSchema.value?.environments?.[0];
const service = environment?.services?.[0];

const formState = ref({
  headers: service?.edge_props?.headers || []
});

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

const saveSettings = async (event: FormSubmitEvent<z.infer<typeof headersSchema>>) => {
  isSaving.value = true;
  try {
    if (!service) {
      console.error('Service not found.');
      return;
    }

    await $client.services.updateServiceConfig.mutate({
      id: service.id,
      edge_props: {
        ...service.edge_props,
        headers: event.data.headers,
      },
    });
    toast.add({ title: 'Application headers updated', color: 'success' });
  } catch (e: any) {
    console.error('Error saving header settings:', e.message);
  } finally {
    refreshApplicationSchema();
    isSaving.value = false;
  }
};
</script>