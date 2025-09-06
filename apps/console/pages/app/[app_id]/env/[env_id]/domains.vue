
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
import { ref, reactive, watch, computed } from 'vue';

definePageMeta({
  layout: 'app',
});

const { currentService } = useApplications();
const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const toast = useToast();

const formState = reactive({
  domain: '' as string | null,
  global_certificate_arn: '' as string | null,
  regional_certificate_arn: '' as string | null,
  hosted_zone_id: '' as string | null,
});

const isSaving = ref(false);
const isLoading = ref(true);

const fetchDomain = async (serviceId: string) => {
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('domains')
      .select('domain, global_certificate_arn, regional_certificate_arn, hosted_zone_id')
      .eq('service_id', serviceId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      formState.domain = data.domain || '';
      formState.global_certificate_arn = data.global_certificate_arn || '';
      formState.regional_certificate_arn = data.regional_certificate_arn || '';
      formState.hosted_zone_id = data.hosted_zone_id || '';
    } else {
      formState.domain = '';
      formState.global_certificate_arn = '';
      formState.regional_certificate_arn = '';
      formState.hosted_zone_id = '';
    }
  } catch (e: any) {
    toast.add({ title: 'Error fetching domain settings', description: e.message, color: 'red' });
  } finally {
    isLoading.value = false;
  }
};

watch(() => currentService.value?.id, (serviceId) => {
  if (serviceId) {
    fetchDomain(serviceId);
  }
}, { immediate: true });

const service = computed(() => currentService.value);

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = service.value?.id;
    if (!serviceId) {
      throw new Error('Service ID not found.');
    }

    await $client.services.upsertDomain.mutate({
      service_id: serviceId,
      domain: formState.domain,
      hosted_zone_id: formState.hosted_zone_id,
      global_certificate_arn: formState.global_certificate_arn || null,
      regional_certificate_arn: formState.regional_certificate_arn || null,
    });
    toast.add({ title: 'Domain settings saved successfully!', color: 'success' });
    await fetchDomain(serviceId);
  } catch (e: any) {
    toast.add({ title: 'Error saving domain settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>
