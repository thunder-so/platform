<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="WebServiceMetadataSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.serviceProps.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="configuration.serviceProps.build_system === 'Custom Dockerfile'" label="Docker File" name="dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.serviceProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Desired Count" name="desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" name="cpu" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.cpu" :default-value="0.25" :min="0.25" :max="192" :step="0.25" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Port" name="port" class="grid grid-cols-3 gap-4">
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