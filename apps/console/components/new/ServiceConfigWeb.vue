<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="metadata.build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="service.metadata.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="service.metadata.build_system === 'Custom Dockerfile'" label="Docker File" name="metadata.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Desired Count" name="metadata.desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" name="metadata.cpu" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.cpu" :default-value="0.25" :min="0.25" :max="192" :step="0.25" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="metadata.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Port" name="metadata.port" class="grid grid-cols-3 gap-4">
        <UInput v-model.number="service.metadata.port" type="number" placeholder="3000" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import { z } from 'zod';
import { type ApplicationInputSchema, appPropsSchema, webServiceMetadataSchema, webServicePipelinePropsSchema } from '~/server/db/types';

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

defineProps({
  service: {
    type: Object as PropType<ServiceInput>,
    required: true
  }
});

const serviceSchema = z.object({
  app_props: appPropsSchema,
  metadata: webServiceMetadataSchema,
  pipeline_props: webServicePipelinePropsSchema
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>