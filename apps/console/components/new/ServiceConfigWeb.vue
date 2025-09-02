<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="metadata.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="metadata.serviceProps.build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="service.metadata.serviceProps.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="service.metadata.serviceProps.build_system === 'Custom Dockerfile'" label="Docker File" name="metadata.serviceProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.serviceProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Desired Count" name="metadata.serviceProps.desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.serviceProps.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" name="metadata.serviceProps.cpu" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.serviceProps.cpu" :default-value="0.25" :min="0.25" :max="192" :step="0.25" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="metadata.serviceProps.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.serviceProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Port" name="metadata.serviceProps.port" class="grid grid-cols-3 gap-4">
        <UInput v-model.number="service.metadata.serviceProps.port" type="number" placeholder="3000" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import { z } from 'zod';
import { WebServiceMetadataSchema } from '~/server/validators/common';
import type { Service } from '~/server/db/schema';

defineProps({
  service: {
    type: Object as PropType<Service>,
    required: true
  }
});

const serviceSchema = z.object({
  metadata: WebServiceMetadataSchema
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>
