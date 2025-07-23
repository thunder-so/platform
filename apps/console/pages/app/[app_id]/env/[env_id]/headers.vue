<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Header Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings">
        <div class="">
          <template v-for="(header, index) in formState.headers" :key="index">
            <UFormField :label="`Path ${index + 1}`" :name="`header-path-${index}`">
              <UInput v-model="header.path" />
            </UFormField>
            <UFormField :label="`Name ${index + 1}`" :name="`header-name-${index}`">
              <UInput v-model="header.name" />
            </UFormField>
            <UFormField :label="`Value ${index + 1}`" :name="`header-value-${index}`">
              <UInput v-model="header.value" />
            </UFormField>
            <div class="col-span-2">
              <UButton icon="i-heroicons-minus" color="info" @click="removeHeader(index)">Remove Header</UButton>
            </div>
          </template>
          <div class="col-span-2">
            <UButton icon="i-heroicons-plus" @click="addHeader">Add Header</UButton>
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
definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();

if (!applicationSchema.value) {
  throw Error('Application schema not found.')
}

const environment = applicationSchema.value?.environments?.[0];
const service = environment?.services?.[0];

const formState = ref({
  headers: service?.edge_props?.headers || []
});

const isSaving = ref(false);

const addHeader = () => {
  formState.value.headers.push({ path: '', name: '', value: '' });
};

const removeHeader = (index: number) => {
  formState.value.headers.splice(index, 1);
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = service?.id;
    if (!serviceId) {
      console.error('Service ID not found.');
      return;
    }

    await $client.services.updateServiceProps.mutate({
      serviceId: serviceId,
      edge_props: { headers: formState.value.headers },
    });
    console.log('Header settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving header settings:', e.message);
  } finally {
    refreshApplicationSchema();
    isSaving.value = false;
  }
};
</script>