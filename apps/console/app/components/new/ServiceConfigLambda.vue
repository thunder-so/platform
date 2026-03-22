<template>
  <ClientOnly>
  <UForm ref="form" v-if="configuration" :state="{ metadata: configuration }" :schema="serviceSchema" :validate-on="['input']" class="space-y-6">
      <UAlert 
        v-if="!hasDockerfile && deploymentMode === 'Zip'" 
        color="warning" 
        variant="subtle" 
        title="Dockerfile not found. Using Zip mode" 
      />

      <UFormField label="Deployment Mode" description="Choose how to deploy the function: container (provide a Dockerfile path) or zip (provide runtime, code output dir and handler)." name="deploymentMode" class="grid grid-cols-3 gap-4">
        <USelect v-model="deploymentMode" :items="['Container','Zip']" class="w-96" size="lg" />
      </UFormField>

      <UFormField v-if="deploymentMode === 'Container'" label="Docker File" description="The path to your Dockerfile." name="functionProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>

      <UFormField v-if="deploymentMode === 'Zip'" label="Install Command" description="Command to install dependencies." name="buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.buildProps.installcmd" placeholder="npm install" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Build Command" description="Command to build your project." name="buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.buildProps.buildcmd" placeholder="npm run build" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Runtime" description="Runtime for the function." name="functionProps.runtime" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.functionProps.runtime" :items="lambdaRuntimes" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="deploymentMode === 'Zip'" label="Code Directory" description="Directory containing built code (e.g. dist/)." name="functionProps.codeDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.functionProps.codeDir" placeholder="dist/" class="w-96" size="lg" required />
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
import { ref, computed, watch } from 'vue';
import { z } from 'zod';
import { LambdaServiceMetadataSchema } from '~~/server/validators/common';
import appConfig from '~/app.config';

type Configuration = z.infer<typeof LambdaServiceMetadataSchema>;

const props = defineProps<{ 
  configuration: Configuration,
  hasDockerfile?: boolean
}>();
const configuration = props.configuration;

// The form schema only needs to include the parts of the service state we want to validate.
const serviceSchema = z.object({
  metadata: LambdaServiceMetadataSchema,
});

const form = ref();
const lambdaRuntimes = (appConfig as any).lambdaRuntimes as Array<{ label: string; value: string }>;
const lambdaRuntimeValues = lambdaRuntimes.map((r) => r.value);
const deploymentMode = ref<'Container' | 'Zip'>(configuration.functionProps?.dockerFile ? 'Container' : 'Zip');
if (!configuration.functionProps) configuration.functionProps = {} as any;
if (!configuration.buildProps) configuration.buildProps = {} as any;
if (!configuration.functionProps.runtime) configuration.functionProps.runtime = lambdaRuntimeValues[0];

// Bidirectional sync between functionProps.runtime and buildProps.runtime_version
watch(() => configuration.functionProps.runtime, (newRuntime) => {
  if (newRuntime && configuration.buildProps) {
    const version = newRuntime.replace('nodejs', '').replace('.x', '');
    configuration.buildProps.runtime_version = version;
  }
});

// Initial sync: if buildProps.runtime_version exists, sync to functionProps.runtime
if (configuration.buildProps?.runtime_version) {
  const matchingRuntime = lambdaRuntimeValues.find(runtime => 
    runtime.replace('nodejs', '').replace('.x', '') === configuration.buildProps.runtime_version
  );
  if (matchingRuntime) {
    configuration.functionProps.runtime = matchingRuntime;
  }
}

const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });

</script>
