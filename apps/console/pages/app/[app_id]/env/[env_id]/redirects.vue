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
  redirects: service?.edge_props?.redirects || [],
  rewrites: service?.edge_props?.rewrites || [],
});

const isSaving = ref(false);

const addRedirect = () => {
  formState.value.redirects.push({ source: '', destination: '' });
};

const removeRedirect = (index: number) => {
  formState.value.redirects.splice(index, 1);
};

const addRewrite = () => {
  formState.value.rewrites.push({ source: '', destination: '', });
};

const removeRewrite = (index: number) => {
  formState.value.rewrites.splice(index, 1);
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
      edge_props: {
        redirects: formState.value.redirects,
        rewrites: formState.value.rewrites,
      },
    });
    console.log('Edge settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving edge settings:', e.message);
  } finally {
    refreshApplicationSchema();
    isSaving.value = false;
  }
};
</script>