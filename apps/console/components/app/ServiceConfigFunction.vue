<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="FunctionServiceMetadataSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" description="Select a custom Dockerfile or use a build system to autogenerate." name="functionProps.build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.functionProps.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="configuration.functionProps.build_system === 'Custom Dockerfile'" label="Docker File" description="The path to your Dockerfile." name="functionProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" description="The memory allocated to your Lambda." name="functionProps.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.functionProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Keep Warm" description="Keep the Lambda warm by invoking every 5 minutes." name="functionProps.keepWarm" class="grid grid-cols-3 gap-4">
        <USwitch v-model="configuration.functionProps.keepWarm" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, computed } from 'vue';
import { z } from 'zod';
import { FunctionServiceMetadataSchema } from '~/server/validators/common';

type Configuration = z.infer<typeof FunctionServiceMetadataSchema>;

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