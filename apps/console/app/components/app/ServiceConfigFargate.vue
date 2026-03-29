<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="FargateServiceMetadataSchema" :validate-on="['input']" class="space-y-6">
      <UFormField label="Instances" description="Number of server instances to launch." name="serviceProps.desiredCount" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.serviceProps.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" description="Number of CPUs to allocate to each instance." name="serviceProps.cpu" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.serviceProps.cpu" :items="appConfig.fargate.cpuOptions" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" description="Amount of memory to allocate to each instance." name="serviceProps.memorySize" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.serviceProps.memorySize" :items="memoryOptions" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Port" description="Container port to proxy to HTTPS." name="serviceProps.port" class="grid grid-cols-3 gap-4">
        <UInput v-model.number="configuration.serviceProps.port" type="number" placeholder="3000" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PropType } from 'vue';
import { z } from 'zod';
import { FargateServiceMetadataSchema } from '~~/server/validators/common';
import appConfig from '~/app.config';

type Configuration = z.infer<typeof FargateServiceMetadataSchema>;

const props = defineProps({
  configuration: {
    type: Object as PropType<Configuration>,
    required: true
  }
});

const memoryOptions = computed(() => {
  const cpu = props.configuration.serviceProps.cpu;
  return appConfig.fargate.memoryOptions[cpu as keyof typeof appConfig.fargate.memoryOptions] || [];
});

watch(() => props.configuration.serviceProps.cpu, (newCpu) => {
  const firstMemoryOption = memoryOptions.value[0];
  if (firstMemoryOption) {
    props.configuration.serviceProps.memorySize = firstMemoryOption.value;
  }
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>