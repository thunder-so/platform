<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Build Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings">
        <div class="">
          <!-- AppProps -->
          <UFormField label="Root directory" name="rootDir">
            <UInput v-model="formState.appProps.rootDir" />
          </UFormField>

          <UFormField label="Output directory" name="outputDir">
            <UInput v-model="formState.appProps.outputDir" />
          </UFormField>

          <!-- BuildProps -->
          <!-- <UFormField label="Runtime" name="runtime">
            <UInput v-model="formState.buildProps.runtime" />
          </UFormField>

          <UFormField label="Runtime Version" name="runtime_version">
            <UInput v-model="formState.buildProps.runtime_version" />
          </UFormField> -->

          <UFormField label="Install Command" name="installcmd">
            <UInput v-model="formState.buildProps.installcmd" />
          </UFormField>

          <UFormField label="Build Command" name="buildcmd">
            <UInput v-model="formState.buildProps.buildcmd" />
          </UFormField>
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
  appProps: {
    rootDir: service?.app_props?.rootDir || '',
    outputDir: service?.app_props?.outputDir || '',
  },
  buildProps: {
    installcmd: service?.pipeline_props?.buildProps?.installcmd || '',
    buildcmd: service?.pipeline_props?.buildProps?.buildcmd || '',
  }
});

const isSaving = ref(false);

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = service?.id;
    if (!serviceId) {
      console.error('Service ID not found.');
      return;
    }
    await $client.services.updateServiceProps.mutate({
      serviceId,
      app_props: formState.value.appProps,
      pipeline_props: {
        buildProps: formState.value.buildProps
      },
    });
    console.log('Build settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving build settings:', e.message);
  } finally {
    refreshApplicationSchema();
    isSaving.value = false;
  }
};
</script>