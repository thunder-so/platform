<template>
  <div>  
    <UAlert v-if="scanError" color="warning" variant="subtle" class="mb-4" :title="scanError" />

    <div v-if="props.serviceLoading" class="flex items-center justify-center py-8">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <div class="text-sm text-muted">Loading configuration...</div>
      </div>
    </div>

    <ClientOnly v-else-if="service">
      <div class="mt-4">
        <ServiceConfigStatic v-if="service.stack_type === 'STATIC'" ref="serviceForm" :configuration="service.metadata" />
        <ServiceConfigLambda v-else-if="service.stack_type === 'LAMBDA'" ref="serviceForm" :configuration="service.metadata" />
        <ServiceConfigFargate v-else-if="service.stack_type === 'FARGATE'" ref="serviceForm" :configuration="service.metadata" />
      </div>
      <EnvironmentVariables v-model="environmentVariablesModel" ref="envVarsForm" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import type { ServiceInputSchema } from '~~/server/validators/new';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigLambda from './ServiceConfigLambda.vue';
import ServiceConfigFargate from './ServiceConfigFargate.vue';
import EnvironmentVariables from './EnvironmentVariables.vue';

const props = defineProps({
  scanError: {
    type: String,
    default: null,
  },
  service: {
    type: Object as PropType<ServiceInputSchema | null>,
    default: null,
  },
  selectedStackType: {
    type: String,
    required: true,
  },
  serviceLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:service']);

const serviceForm = ref();
const envVarsForm = ref();

const environmentVariablesModel = computed({
  get() {
    if (!props.service || !props.service.service_variables) return [];
    return props.service.service_variables.map(v => ({ key: v.key, value: v.value }));
  },
  set(newValue: { key: string; value: string }[]) {
    if (!props.service) return;
    
    const updatedService = { ...props.service };
    const variableType = updatedService.stack_type === 'STATIC' ? 'build' : 'runtime';

    updatedService.service_variables = newValue.map(v => ({
      key: v.key,
      value: v.value,
      type: variableType,
    }));

    emit('update:service', updatedService);
  }
});

const hasErrors = computed(() => {
  return serviceForm.value?.errors?.length > 0;
});

defineExpose({ hasErrors });
</script>
