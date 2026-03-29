<template>
  <ClientOnly>
  <UForm ref="form" v-if="service" :state="service" :validate-on="['input']" class="space-y-6">
      <UAlert 
        v-if="!hasDockerfile && deploymentMode === 'Zip'" 
        color="warning" 
        variant="subtle" 
        title="Dockerfile not found. Using Zip mode" 
      />

      <UFormField label="Deployment Mode" description="Choose how to deploy the function: container (provide a Dockerfile path) or zip (provide runtime, code output dir and handler)." name="deploymentMode" class="grid grid-cols-3 gap-4">
        <USelect v-model="deploymentMode" :items="['Container','Zip']" class="w-96" size="lg" />
      </UFormField>

      <UFormField v-if="deploymentMode === 'Container'" label="Docker File" description="The path to your Dockerfile." name="metadata.functionProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.functionProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>

      <UFormField v-if="deploymentMode === 'Zip'" label="Install Command" description="Command to install dependencies." name="pipeline_metadata.buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_metadata.buildProps.installcmd" placeholder="npm install" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Build Command" description="Command to build your project." name="pipeline_metadata.buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_metadata.buildProps.buildcmd" placeholder="npm run build" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Runtime" description="Runtime for the function." name="metadata.functionProps.runtime" class="grid grid-cols-3 gap-4">
        <USelect v-model="service.metadata.functionProps.runtime" :items="lambdaRuntimes" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Code Directory" description="Directory containing built code (e.g. dist/)." name="metadata.functionProps.codeDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.functionProps.codeDir" placeholder="dist/" class="w-96" size="lg" required />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Handler" description="Function handler (e.g. index.handler)." name="metadata.functionProps.handler" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.functionProps.handler" placeholder="index.handler" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" description="The memory allocated to your Lambda." name="metadata.functionProps.memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="service.metadata.functionProps.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Keep Warm" description="Keep the Lambda warm by invoking every 5 minutes." name="metadata.functionProps.keepWarm" class="grid grid-cols-3 gap-4">
        <USwitch v-model="service.metadata.functionProps.keepWarm" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ServiceInputSchema } from '~~/server/validators/new';
import appConfig from '~/app.config';

const props = defineProps<{ 
  service: ServiceInputSchema,
  hasDockerfile?: boolean
}>();

const form = ref();
const lambdaRuntimes = (appConfig as any).lambdaRuntimes as Array<{ label: string; value: string }>;
const lambdaRuntimeValues = lambdaRuntimes.map((r) => r.value);
const deploymentMode = ref<'Container' | 'Zip'>(props.service.metadata.functionProps?.dockerFile ? 'Container' : 'Zip');

const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });

</script>
