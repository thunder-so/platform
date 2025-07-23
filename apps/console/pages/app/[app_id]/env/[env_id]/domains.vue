<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Domain Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings">
        <div class="">
          <UFormField label="Domain" name="domain">
            <UInput v-model="formState.domain" />
          </UFormField>

          <UFormField label="Global Certificate ARN" name="globalCertificateArn">
            <UInput v-model="formState.globalCertificateArn" />
          </UFormField>

          <UFormField label="Regional Certificate ARN" name="regionalCertificateArn">
            <UInput v-model="formState.regionalCertificateArn" />
          </UFormField>

          <UFormField label="Hosted Zone ID" name="hostedZoneId">
            <UInput v-model="formState.hostedZoneId" />
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
  domain: service?.domain_props?.domain,
  globalCertificateArn: service?.domain_props?.globalCertificateArn,
  regionalCertificateArn: service?.domain_props?.regionalCertificateArn,
  hostedZoneId: service?.domain_props?.hostedZoneId,
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
      serviceId: serviceId,
      domain_props: formState.value,
    });
    console.log('Domain settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving domain settings:', e.message);
  } finally {
    refreshApplicationSchema();
    isSaving.value = false;
  }
};
</script>