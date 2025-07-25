<template>
  <ClientOnly>
    <UForm :state="service" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" name="app_props.outputDir">
        <UInput v-model="service.app_props.outputDir" placeholder="public/" class="w-96" size="lg" />
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
import type { ServiceSchema } from '~/server/db/schema';

const props = defineProps<{ service: ServiceSchema }>();
const appConfig = useAppConfig();
const runtimes = ref(appConfig.runtimes);
</script>