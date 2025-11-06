<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Service Configuration</h2>
  
    <UAlert v-if="scanError" color="warning" variant="subtle" class="mb-4" :title="scanError" />

    <ClientOnly v-if="service">
      <div class="mt-4">
        <ServiceConfigStatic v-if="service.stack_type === 'SPA'" ref="serviceForm" :configuration="service.metadata" />
        <ServiceConfigFunction v-else-if="service.stack_type === 'FUNCTION'" ref="serviceForm" :configuration="service.metadata" />
        <ServiceConfigWeb v-else-if="service.stack_type === 'WEB_SERVICE'" ref="serviceForm" :configuration="service.metadata" />
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
import ServiceConfigFunction from './ServiceConfigFunction.vue';
import ServiceConfigWeb from './ServiceConfigWeb.vue';
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
    const variableType = updatedService.stack_type === 'SPA' ? 'build' : 'runtime';

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
