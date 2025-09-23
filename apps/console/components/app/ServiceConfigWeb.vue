<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="WebServiceMetadataSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" description="Select a custom Dockerfile or use a build system to autogenerate." name="build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.serviceProps.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="configuration.serviceProps.build_system === 'Custom Dockerfile'" label="Docker File" description="The path to your Dockerfile." name="dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.serviceProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Instances" description="Number of server instances to launch." name="desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" description="Number of CPUs to allocate to each instance." name="cpu" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.cpu" :default-value="0.25" :min="0.25" :max="192" :step="0.25" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" description="Amount of memory to allocate to each instance." name="memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Port" description="Container port to proxy to HTTPS." name="port" class="grid grid-cols-3 gap-4">
        <UInput v-model.number="configuration.serviceProps.port" type="number" placeholder="3000" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import { z } from 'zod';
import { WebServiceMetadataSchema } from '~/server/validators/common';

type Configuration = z.infer<typeof WebServiceMetadataSchema>;

defineProps({
  configuration: {
    type: Object as PropType<Configuration>,
    required: true
  }
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>