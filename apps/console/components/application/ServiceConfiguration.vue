<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Service Configuration</h2>
  
    <UAlert v-if="scanError" color="warning" variant="subtle" class="mb-4" :title="scanError" />

    <ClientOnly v-if="service">
      <div class="mt-4">
        <ServiceConfigStatic v-if="service.stack_type === 'SPA'" ref="serviceForm" :service="service" />
        <ServiceConfigFunction v-else-if="service.stack_type === 'FUNCTION'" ref="serviceForm" :service="service" />
        <ServiceConfigWeb v-else-if="service.stack_type === 'WEB_SERVICE'" ref="serviceForm" :service="service" />
      </div>
      <EnvironmentVariables v-model="environmentVariablesModel" ref="envVarsForm" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import type { Service } from '~/server/db/schema';
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
    type: Object as PropType<Service | null>,
    default: null,
  },
});

const serviceForm = ref();
const envVarsForm = ref();

const environmentVariablesModel = computed({
  get() {
    if (!props.service) return [];
    let vars: Record<string, string>[] = [];
    if (props.service.stack_type === 'SPA') {
      vars = props.service.pipeline_props?.buildProps?.environment || [];
    } else {
      vars = props.service.metadata?.variables || [];
    }
    return vars.map(v => ({ key: Object.keys(v)[0], value: Object.values(v)[0] }));
  },
  set(newValue: { key: string; value: string }[]) {
    if (!props.service) return;
    const transformedValue = newValue.map(v => ({ [v.key]: v.value }));
    if (props.service.stack_type === 'SPA') {
      if (props.service.pipeline_props?.buildProps) {
        props.service.pipeline_props.buildProps.environment = transformedValue;
      }
    } else {
      if (props.service.metadata) {
        props.service.metadata.variables = transformedValue;
      }
    }
  }
});

const hasErrors = computed(() => {
  return serviceForm.value?.errors?.length > 0 || envVarsForm.value?.hasErrors;
});

defineExpose({ hasErrors });
</script>