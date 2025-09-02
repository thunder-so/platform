<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="metadata.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="metadata.functionProps.build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="service.metadata.functionProps.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="service.metadata.functionProps.build_system === 'Custom Dockerfile'" label="Docker File" name="metadata.functionProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.functionProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="metadata.functionProps.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.functionProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Keep Warm" name="metadata.functionProps.keepWarm" class="grid grid-cols-3 gap-4">
        <USwitch v-model="service.metadata.functionProps.keepWarm" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { z } from 'zod';
import { FunctionServiceMetadataSchema } from '~/server/validators/common';
import type { Service } from '~/server/db/schema';

defineProps({
  service: {
    type: Object as PropType<Service>,
    required: true
  }
});

// The form schema only needs to include the parts of the service state we want to validate.
const serviceSchema = z.object({
  metadata: FunctionServiceMetadataSchema,
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });

</script>
