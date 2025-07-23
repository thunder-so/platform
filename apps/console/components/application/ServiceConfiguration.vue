<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Service Configuration</h2>
    <URadioGroup v-model="service.stackType" :items="serviceTypes" orientation="horizontal" variant="card" />

    <div class="mt-4">
      <ServiceConfigStatic v-if="service.stackType === 'SPA'" />
      <ServiceConfigFunction v-else-if="service.stackType === 'LAMBDA'" />
      <ServiceConfigWeb v-else-if="service.stackType === 'ECS'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigFunction from './ServiceConfigFunction.vue';
import ServiceConfigWeb from './ServiceConfigWeb.vue';

const { service, setServiceType } = useNewApplicationFlow();

const serviceTypes = [
  { label: 'Static', value: 'SPA', description: 'Hosted on S3 and CloudFront' },
  { label: 'Function', value: 'LAMBDA', description: 'Serverless Lambda function' },
  { label: 'Web Service', value: 'ECS', description: 'Container deployed on ECS Fargate' },
];

if (!service.value.stackType) {
  setServiceType('SPA');
}
</script>