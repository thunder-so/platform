<template>
  <ClientOnly>
    <UForm v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="metadata.buildSystem" class="grid grid-cols-3 gap-4">
        <USelect v-model="service.metadata.buildSystem" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="service.metadata.buildSystem === 'Custom Dockerfile'" label="Docker File" name="metadata.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="metadata.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Keep Warm" name="metadata.keepWarm" class="grid grid-cols-3 gap-4">
        <USwitch v-model="service.metadata.keepWarm" />
      </UFormField>
      <!-- The name prop links this component to the form's validation schema -->
      <EnvironmentVariables v-model="service.metadata.variables" name="metadata.variables" />
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { z } from 'zod';
import type { ApplicationInputSchema } from '~/server/trpc/routers/applications.router';
import { appPropsSchema, functionMetadataSchema, functionPipelinePropsSchema } from '~/server/db/types';
import EnvironmentVariables from './EnvironmentVariables.vue';

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

defineProps({
  service: {
    type: Object as PropType<ServiceInput>,
    required: true
  }
});

// The form schema only needs to include the parts of the service state we want to validate.
const serviceSchema = z.object({
  app_props: appPropsSchema,
  metadata: functionMetadataSchema,
  pipeline_props: functionPipelinePropsSchema
});

</script>
