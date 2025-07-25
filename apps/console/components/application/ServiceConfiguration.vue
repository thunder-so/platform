<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Service Configuration</h2>
    <ClientOnly v-if="service">
      <URadioGroup v-model="selectedStackType" :items="serviceTypes" orientation="horizontal" variant="card" />

      <div class="mt-4">
        <ServiceConfigStatic v-if="service.stack_type === 'SPA'" :service="service" />
        <ServiceConfigFunction v-else-if="service.stack_type === 'LAMBDA'" :service="service" />
        <ServiceConfigWeb v-else-if="service.stack_type === 'ECS'" :service="service" />
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

const { applicationSchema, setServiceType } = useNewApplicationFlow();

const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);

const selectedStackType = computed({
  get: () => service.value?.stack_type,
  set: (value) => {
    if (value) {
      setServiceType(value as Service['stack_type']);
    }
  },
});

const serviceTypes = [
  { label: 'Static', value: 'SPA', description: 'Hosted on S3 and CloudFront' },
  { label: 'Function', value: 'LAMBDA', description: 'Serverless Lambda function' },
  { label: 'Web Service', value: 'ECS', description: 'Container deployed on ECS Fargate' },
];

watch(service, (newService) => {
  if (newService && !newService.stack_type) {
    setServiceType('SPA');
  }
}, { immediate: true });
</script>