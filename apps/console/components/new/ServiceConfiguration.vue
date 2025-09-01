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

const hasErrors = computed(() => {
  return serviceForm.value?.errors?.length > 0;
});

defineExpose({ hasErrors });
</script>
