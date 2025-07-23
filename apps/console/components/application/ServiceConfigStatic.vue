<template>
  <UForm :state="service" class="space-y-4">
    <UFormField label="Root Directory" name="appProps.rootDir">
      <UInput v-model="service.appProps.rootDir" placeholder="./" class="w-96" size="lg" />
    </UFormField>
    <UFormField label="Output Directory" name="appProps.outputDir">
      <UInput v-model="service.appProps.outputDir" placeholder="public/" class="w-96" size="lg" />
    </UFormField>

    <UFormField label="Runtime" name="pipelineProps.buildProps.runtime">
      <USelect 
        v-model="service.pipelineProps.buildProps.runtime" 
        :items="appConfig.runtimes" 
        option-attribute="label" 
        value-key="value" 
        class="w-128" size="lg"
      />
    </UFormField>
    <UFormField label="Install Command" name="pipelineProps.buildProps.installcmd">
      <UInput v-model="service.pipelineProps.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
    </UFormField>
    <UFormField label="Build Command" name="pipelineProps.buildProps.buildcmd">
      <UInput v-model="service.pipelineProps.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
    </UFormField>
  </UForm>
</template>

<script setup lang="ts">
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

const { service } = useNewApplicationFlow();
const appConfig = useAppConfig();

if (!service.value.appProps) {
  service.value.appProps = {};
}
if (!service.value.pipelineProps) {
  service.value.pipelineProps = { buildProps: {} };
}
if (!service.value.pipelineProps.buildProps) {
  service.value.pipelineProps.buildProps = {};
}

if (appConfig.runtimes.length > 0) {
  service.value.pipelineProps.buildProps.runtime = appConfig.runtimes[appConfig.runtimes.length - 1].value;
}
</script>