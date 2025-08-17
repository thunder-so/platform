<template>
  <ClientOnly>
    <UForm v-if="service" :state="service" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" name="metadata.outputDir">
        <UInput v-model="service.metadata.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Runtime" name="pipeline_props.buildProps.runtime_version">
        <USelect 
          v-model="service.pipeline_props.buildProps.runtime_version" 
          :items="runtimes" 
          option-attribute="label" 
          value-key="value" 
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" name="pipeline_props.buildProps.installcmd">
        <UInput v-model="service.pipeline_props.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" name="pipeline_props.buildProps.buildcmd">
        <UInput v-model="service.pipeline_props.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { ApplicationInputSchema } from '~/server/trpc/routers/applications.router';
// const { scanRepository, scannedBuildProps } = useNewApplicationFlow();

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

const props = defineProps({
  service: {
    type: Object as PropType<ServiceInput>,
    required: true
  }
});

const appConfig = useAppConfig();
const runtimes = ref(appConfig.runtimes);

// onMounted(() => {
//   if (!scannedBuildProps.value && props.service.pipeline_props) {
//     scanRepository(
//       props.service.pipeline_props.sourceProps.owner, 
//       props.service.pipeline_props.sourceProps.repo, 
//       props.service.installation_id
//     );
//   }
// });
</script>