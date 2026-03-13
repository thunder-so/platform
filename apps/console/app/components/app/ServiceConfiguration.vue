<template>
  <div v-if="service">
    <ServiceConfigStatic v-if="service.stack_type === 'STATIC'" ref="serviceForm" :configuration="service.metadata" />
    <ServiceConfigLambda v-else-if="service.stack_type === 'LAMBDA'" ref="serviceForm" :configuration="service.metadata" />
    <ServiceConfigFargate v-else-if="service.stack_type === 'FARGATE'" ref="serviceForm" :configuration="service.metadata" />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { PropType } from 'vue';
import type { ServiceSchema } from '~~/server/validators/app';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigLambda from './ServiceConfigLambda.vue';
import ServiceConfigFargate from './ServiceConfigFargate.vue';

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
