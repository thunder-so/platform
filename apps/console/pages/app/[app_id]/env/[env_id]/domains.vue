
<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Domain Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings" class="space-y-4">
        <UFormField label="Domain" name="domain">
          <UInput v-model="formState.domain" />
        </UFormField>

        <UFormField v-if="service?.stack_type === 'SPA' || service?.stack_type === 'WEB_SERVICE'" label="Global Certificate ARN (for CloudFront)" name="global_certificate_arn">
          <UInput v-model="formState.global_certificate_arn" />
        </UFormField>

        <UFormField v-if="service?.stack_type === 'FUNCTION' || service?.stack_type === 'WEB_SERVICE'" label="Regional Certificate ARN (for API Gateway/ALB)" name="regional_certificate_arn">
          <UInput v-model="formState.regional_certificate_arn" />
        </UFormField>

        <UFormField label="Hosted Zone ID" name="hosted_zone_id">
          <UInput v-model="formState.hosted_zone_id" />
        </UFormField>

        <div class="mt-4">
          <UButton type="submit" :loading="isSaving">Save Settings</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();

if (!applicationSchema.value) {
  throw Error('Application schema not found.')
}

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0]);
const domain = computed(() => service.value?.domains?.[0]);

const formState = ref({
  domain: domain.value?.domain ?? '',
  global_certificate_arn: domain.value?.globalCertificateArn ?? '',
  regional_certificate_arn: domain.value?.regionalCertificateArn ?? '',
  hosted_zone_id: domain.value?.hostedZoneId ?? '',
});

const isSaving = ref(false);

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = service.value?.id;
    if (!serviceId) {
      throw new Error('Service ID not found.');
    }

    await $client.services.upsertDomain.mutate({
      service_id: serviceId,
      domain: formState.value.domain,
      hosted_zone_id: formState.value.hosted_zone_id,
      global_certificate_arn: formState.value.global_certificate_arn || null,
      regional_certificate_arn: formState.value.regional_certificate_arn || null,
    });
    toast.add({ title: 'Domain settings saved successfully!', color: 'success' });
    await refreshApplicationSchema();
  } catch (e: any) {
    toast.add({ title: 'Error saving domain settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>
