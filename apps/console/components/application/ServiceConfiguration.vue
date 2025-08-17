<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Service Configuration</h2>
    <ClientOnly v-if="service">
      <!-- <URadioGroup 
        v-model="selectedStackType" 
        :items="serviceTypes" 
        orientation="horizontal" 
        color="success" 
        variant="table"
        :ui="{ fieldset: 'w-full grid grid-cols-3' }"
      /> -->

      <div class="mt-4">
        <ServiceConfigStatic v-if="service.stack_type === 'SPA'" :service="service" />
        <ServiceConfigFunction v-else-if="service.stack_type === 'FUNCTION'" :service="service" />
        <ServiceConfigWeb v-else-if="service.stack_type === 'WEB_SERVICE'" :service="service" />
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigFunction from './ServiceConfigFunction.vue';
import ServiceConfigWeb from './ServiceConfigWeb.vue';
import type { Service } from '~/server/db/schema';

const { applicationSchema } = useNewApplicationFlow();

const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);

// const selectedStackType = computed({
//   get: () => service.value?.stack_type || 'SPA',
//   set: (value) => {
//     if (value) {
//       console.log('Setting service type:', value);
//       setServiceType(value as Service['stack_type']);
//     }
//   },
// });

// const serviceTypes = [
//   { label: 'Static', value: 'SPA', description: 'Hosted on S3 and CloudFront' },
//   { label: 'Function', value: 'FUNCTION', description: 'Serverless Lambda function' },
//   { label: 'Web Service', value: 'WEB_SERVICE', description: 'Container deployed on ECS Fargate' },
// ];

// watch(service, (newService) => {
//   if (newService && !newService.stack_type) {
//     setServiceType('SPA');
//   }
// }, { immediate: true });
</script>