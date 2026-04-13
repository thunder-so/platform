<template>
  <ClientOnly>
  <UForm ref="form" v-if="service && service.stack_type === 'FARGATE'" :state="service" :validate-on="['input']" class="space-y-6">
      <UAlert 
        v-if="!hasDockerfile && (service.pipeline_metadata!.buildProps as any).buildSystem === 'Nixpacks'" 
        color="warning" 
        variant="subtle" 
        title="Dockerfile not found. Using Nixpacks" 
      />

      <UFormField label="Build System" description="Select a Dockerfile or use a build system to autogenerate." name="pipeline_metadata.buildProps.buildSystem" class="grid grid-cols-3 gap-4">
        <USelect v-model="(service.pipeline_metadata!.buildProps as any).buildSystem" :items="['Nixpacks', 'Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="(service.pipeline_metadata!.buildProps as any).buildSystem === 'Dockerfile'" label="Docker File" description="The path to your Dockerfile." name="metadata.serviceProps.dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="(service.metadata as any).serviceProps.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="(service.pipeline_metadata!.buildProps as any).buildSystem === 'Nixpacks'" label="Install Command" description="This is the script that installs the dependencies in your package.json file." name="pipeline_metadata.buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_metadata!.buildProps!.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField v-if="(service.pipeline_metadata!.buildProps as any).buildSystem === 'Nixpacks'" label="Build Command" description="This is typically the script that compiles resources needed by your app." name="pipeline_metadata.buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_metadata!.buildProps!.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
      <UFormField v-if="(service.pipeline_metadata!.buildProps as any).buildSystem === 'Nixpacks'" label="Start Command" description="The command to start your application in runtime." name="pipeline_metadata.buildProps.startcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="(service.pipeline_metadata!.buildProps as any).startcmd" placeholder="" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Instances" description="Number of server instances to launch." name="metadata.serviceProps.desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="(service.metadata as any).serviceProps.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" description="Number of CPUs to allocate to each instance." name="metadata.serviceProps.cpu" class="grid grid-cols-3 gap-4">
        <USelect v-model="(service.metadata as any).serviceProps.cpu" :items="appConfig.fargate.cpuOptions" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" description="Amount of memory to allocate to each instance." name="metadata.serviceProps.memorySize" class="grid grid-cols-3 gap-4">
        <USelect v-model="(service.metadata as any).serviceProps.memorySize" :items="memoryOptions" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Port" description="Container port to proxy to HTTPS." name="metadata.serviceProps.port" class="grid grid-cols-3 gap-4">
        <UInput v-model.number="(service.metadata as any).serviceProps.port" type="number" placeholder="3000" size="lg" />
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

const memoryOptions = computed(() => {
  if (props.service.stack_type !== 'FARGATE') return [];
  const cpu = (props.service.metadata as any).serviceProps.cpu;
  return appConfig.fargate.memoryOptions[cpu as keyof typeof appConfig.fargate.memoryOptions] || [];
});

watch(() => props.service.stack_type === 'FARGATE' ? (props.service.metadata as any).serviceProps.cpu : null, (newCpu) => {
  if (props.service.stack_type !== 'FARGATE' || !newCpu) return;
  const firstMemoryOption = memoryOptions.value[0];
  if (firstMemoryOption) {
    (props.service.metadata as any).serviceProps.memorySize = firstMemoryOption.value;
  }
});

// Watch buildSystem changes and sync dockerFile to schema
watch(() => (props.service.pipeline_metadata?.buildProps as any)?.buildSystem, (newBuildSystem) => {
  if (props.service.stack_type !== 'FARGATE') return;
  
  const serviceProps = (props.service.metadata as any).serviceProps;
  
  if (newBuildSystem === 'Dockerfile') {
    // Dockerfile mode: set dockerFile (default to 'Dockerfile' if not set)
    serviceProps.dockerFile = serviceProps.dockerFile || 'Dockerfile';
  } else {
    // Nixpacks mode: clear dockerFile to ensure strict mode detection
    delete serviceProps.dockerFile;
  }
}, { immediate: true });

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>
