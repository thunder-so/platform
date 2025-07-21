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
          <UFormField label="Runtime" name="runtime">
            <UInput v-model="formState.buildProps.runtime" />
          </UFormField>

          <UFormField label="Runtime Version" name="runtime_version">
            <UInput v-model="formState.buildProps.runtime_version" />
          </UFormField>

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
  appProps: {
    rootDir: '',
    outputDir: ''
  },
  buildProps: {
    runtime: '',
    runtime_version: '',
    installcmd: '',
    buildcmd: '',
  }
});

const isSaving = ref(false);

const fetchBuildSettings = async (serviceId: string) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('app_props, pipeline_props')
      .eq('id', serviceId)
      .single();

    if (error) throw error;

    if (data?.pipeline_props) {
      formState.value = {
        appProps: {
          rootDir: data.app_props?.rootDir || '',
          outputDir: data.app_props?.outputDir || '',
        },
        buildProps: { 
          runtime: data.pipeline_props?.buildProps.runtime || '',
          runtime_version: data.pipeline_props?.buildProps.runtime_version || '',
          installcmd: data.pipeline_props?.buildProps.installcmd || '',
          buildcmd: data.pipeline_props?.buildProps.buildcmd || '',
        }
      };
    }
  } catch (e: any) {
    console.error('Error fetching build settings:', e.message);
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

    await $client.services.updatePipelineProps.mutate({
      serviceId: serviceId,
      appProps: formState.value.appProps,
      pipelineProps: {
        buildProps: formState.value.buildProps
      },
    });
    console.log('Build settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving build settings:', e.message);
  } finally {
    isSaving.value = false;
  }
};

watch(applicationSchema, (newSchema) => {
  if (newSchema) {
    const serviceId = newSchema.environments[0]?.services[0]?.id;
    if (serviceId) {
      fetchBuildSettings(serviceId);
    }
  }
}, { immediate: true });

// onMounted(() => {
//   if (applicationSchema.value) {
//     const serviceId = applicationSchema.value.environments[0]?.services[0]?.id;
//     if (serviceId) {
//       fetchBuildSettings(serviceId);
//     }
//   }
// });
</script>