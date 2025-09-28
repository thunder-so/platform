<template>
  <div v-if="service">
    <ServiceConfigStatic v-if="service.stack_type === 'SPA'" ref="serviceForm" :configuration="service.metadata" />
    <ServiceConfigFunction v-else-if="service.stack_type === 'FUNCTION'" ref="serviceForm" :configuration="service.metadata" />
    <ServiceConfigWeb v-else-if="service.stack_type === 'WEB_SERVICE'" ref="serviceForm" :configuration="service.metadata" />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { PropType } from 'vue';
import type { ServiceSchema } from '~/server/validators/app';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigFunction from './ServiceConfigFunction.vue';
import ServiceConfigWeb from './ServiceConfigWeb.vue';

const props = defineProps({
  service: {
    type: Object as PropType<ServiceSchema>,
    required: true,
  },
});

const serviceForm = shallowRef<{ errors: any[] } | null>(null);
const hasErrors = computed(() => (serviceForm.value?.errors?.length || 0) > 0);

defineExpose({ hasErrors });
</script>