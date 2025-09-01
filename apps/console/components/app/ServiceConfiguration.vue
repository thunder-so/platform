<template>
  <div v-if="service">
    <component :is="serviceComponent" :configuration="service.metadata" ref="serviceForm" v-if="service.metadata" />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { PropType } from 'vue';
import type { ServiceSchema as Service } from '~/server/db/schema';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigFunction from './ServiceConfigFunction.vue';
import ServiceConfigWeb from './ServiceConfigWeb.vue';

const props = defineProps({
  service: {
    type: Object as PropType<Service>,
    required: true,
  },
});

const serviceComponent = computed(() => {
  switch (props.service?.stack_type) {
    case 'SPA':
      return ServiceConfigStatic;
    case 'FUNCTION':
      return ServiceConfigFunction;
    case 'WEB_SERVICE':
      return ServiceConfigWeb;
    default:
      return null;
  }
});

const serviceForm = shallowRef<{ errors: any[] } | null>(null);
const hasErrors = computed(() => (serviceForm.value?.errors?.length || 0) > 0);

defineExpose({ hasErrors });
</script>