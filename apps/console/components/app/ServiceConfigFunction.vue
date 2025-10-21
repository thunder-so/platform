<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="FunctionServiceMetadataSchema" :validate-on="['input']" class="space-y-6">
      <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Deployment Mode" description="Choose how to deploy the function: container (provide a Dockerfile path) or zip (provide runtime, code output dir and handler)." name="deploymentMode" class="grid grid-cols-3 gap-4">
        <USelect v-model="deploymentMode" :items="['Container','Zip']" class="w-96" size="lg" />
      </UFormField>

      <UFormField v-if="deploymentMode === 'Container'" label="Docker File" description="The path to your Dockerfile." name="functionProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>

      <UFormField v-if="deploymentMode === 'Zip'" label="Runtime" description="Runtime for the function." name="functionProps.runtime" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.runtime" placeholder="nodejs22.x" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Code Directory" description="Directory containing built code (e.g. dist/)." name="functionProps.codeDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.codeDir" placeholder="dist/" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Handler" description="Function handler (e.g. index.handler)." name="functionProps.handler" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.handler" placeholder="index.handler" class="w-96" size="lg" />
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

const props = defineProps<{ configuration: Configuration }>();
const configuration = props.configuration;

const form = ref();
const deploymentMode = ref<'Container' | 'Zip'>(configuration.functionProps?.dockerFile ? 'Container' : 'Zip');
if (!configuration.functionProps) configuration.functionProps = {} as any;
if (!configuration.functionProps.runtime) configuration.functionProps.runtime = 'nodejs22.x';
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });

</script>