<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-6">
      <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." name="metadata.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" description="Select a custom Dockerfile or use a build system to autogenerate." name="metadata.serviceProps.build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="service.metadata.serviceProps.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="service.metadata.serviceProps.build_system === 'Custom Dockerfile'" label="Docker File" description="The path to your Dockerfile." name="metadata.serviceProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.serviceProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Instances" description="Number of server instances to launch." name="metadata.serviceProps.desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.serviceProps.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" description="Number of CPUs to allocate to each instance." name="metadata.serviceProps.cpu" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.serviceProps.cpu" :default-value="0.25" :min="0.25" :max="192" :step="0.25" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" description="Amount of memory to allocate to each instance." name="metadata.serviceProps.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.serviceProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Port" description="Container port to proxy to HTTPS." name="metadata.serviceProps.port" class="grid grid-cols-3 gap-4">
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
