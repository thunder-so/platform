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
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useApplications } from '~/composables/useApplications';
import { useSupabaseClient } from '#imports';

definePageMeta({
  layout: 'app',
});

const route = useRoute();
const supabase = useSupabaseClient();
const { applicationSchema } = useApplications();
const { $client } = useNuxtApp();

const formState = ref({
  domain: '',
  globalCertificateArn: '',
  regionalCertificateArn: '',
  hostedZoneId: '',
});

const isSaving = ref(false);

const fetchDomainSettings = async (serviceId: string) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('domain_props')
      .eq('id', serviceId)
      .single();

    if (error) throw error;

    if (data?.domain_props) {
      formState.value = {
        domain: data.domain_props.domain || '',
        globalCertificateArn: data.domain_props.globalCertificateArn || '',
        regionalCertificateArn: data.domain_props.regionalCertificateArn || '',
        hostedZoneId: data.domain_props.hostedZoneId || '',
      };
    }
  } catch (e: any) {
    console.error('Error fetching domain settings:', e.message);
  }
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = applicationSchema.value?.environments[0]?.services[0]?.id;
    if (!serviceId) {
      console.error('Service ID not found.');
      return;
    }

    await $client.services.updateDomainProps.mutate({
      serviceId: serviceId,
      domainProps: formState.value,
    });
    console.log('Domain settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving domain settings:', e.message);
  } finally {
    isSaving.value = false;
  }
};

watch(applicationSchema, (newSchema) => {
  if (newSchema) {
    const serviceId = newSchema.environments[0]?.services[0]?.id;
    if (serviceId) {
      fetchDomainSettings(serviceId);
    }
  }
}, { immediate: true });

// onMounted(() => {
//   if (applicationSchema.value) {
//     const serviceId = applicationSchema.value.environments[0]?.services[0]?.id;
//     if (serviceId) {
//       fetchDomainSettings(serviceId);
//     }
//   }
// });
</script>