<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" name="metadata.outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Runtime" name="pipeline_props.buildProps.runtime_version" class="grid grid-cols-3 gap-4">
        <USelect 
          v-model="service.pipeline_props.buildProps.runtime_version" 
          :items="runtimes" 
          option-attribute="label" 
          value-key="value" 
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" name="pipeline_props.buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_props.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" name="pipeline_props.buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_props.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { z } from 'zod';
import { ref, computed } from 'vue';
import { type ApplicationInputSchema, appPropsSchema, spaMetadataSchema, spaPipelinePropsSchema } from '~/server/db/types';

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

const props = defineProps({
  service: {
    type: Object as PropType<ServiceInput>,
    required: true
  }
});

const appConfig = useAppConfig();
const runtimes = ref(appConfig.runtimes);

const serviceSchema = z.object({
  app_props: appPropsSchema,
  metadata: spaMetadataSchema,
  pipeline_props: spaPipelinePropsSchema
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>
