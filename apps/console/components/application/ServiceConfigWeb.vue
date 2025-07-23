<template>
  <UForm :state="service" class="space-y-4">
    <UFormField label="Root Directory" name="appProps.rootDir">
      <UInput v-model="service.appProps.rootDir" placeholder="./" class="w-96" size="lg" />
    </UFormField>
    <UFormField label="Docker File" name="metadata.dockerFile">
      <UInput v-model="service.metadata.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
    </UFormField>
    <UFormField label="Desired Count" name="metadata.desiredCount">
      <!-- <UInput v-model.number="service.metadata.desiredCount" type="number" placeholder="1" size="lg" /> -->
      <UInputNumber v-model="service.metadata.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
    </UFormField>
    <UFormField label="CPU" name="metadata.cpu">
      <!-- <UInput v-model.number="service.metadata.cpu" type="number" placeholder="0.25" size="lg" /> -->
      <UInputNumber v-model="service.metadata.cpu" :default-value="0.25" :min="0.25" :max="192" step="0.25" size="lg" />
    </UFormField>
    <UFormField label="Memory Size (MB)" name="metadata.memorySize">
      <UInputNumber v-model="service.metadata.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
    </UFormField>
    <UFormField label="Port" name="metadata.port">
      <UInput v-model.number="service.metadata.port" type="number" placeholder="3000" size="lg" />
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
if (!service.value.metadata) {
  service.value.metadata = {};
}

if (appConfig.runtimes.length > 0) {
  service.value.pipelineProps.buildProps.runtime = appConfig.runtimes[0].runtime;
  service.value.pipelineProps.buildProps.runtime_version = appConfig.runtimes[0].value;
}

service.value.metadata.architecture = 'ARM64';
</script>