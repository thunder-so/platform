<template>
  <div>
    <Header />

    <UContainer>
      <div class="mt-8 mb-6 pb-6 border-b border-muted">
        <h1 class="text-2xl font-bold mb-6">{{ pageTitle }}</h1>
        <div class="flex items-center space-x-4">
          <div v-for="(step, index) in steps" :key="index" class="flex items-center">
            <div :class="['step', { 'active': currentStep >= index + 1, 'completed': currentStep > index + 1 }]">
              <span v-if="currentStep <= index + 1">{{ index + 1 }}</span>
              <UIcon v-else name="i-heroicons-check" />
            </div>
            <span class="label leading-8" :class="{'font-bold': currentStep === index + 1}">{{ step.label }}</span>
            <div v-if="index < steps.length - 1" class="separator"></div>
          </div>
        </div>
      </div>

      <main class="mb-12">
        <slot />
      </main>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

const { currentStep, applicationSchema } = useNewApplicationFlow();

const route = useRoute();

const pageTitle = computed(() => {
  const stackType = route.query.stack_type;
  switch (stackType) {
    case 'SPA':
      return 'Create new Static Site';
    case 'FUNCTION':
      return 'Create new Lambda Function';
    case 'WEB_SERVICE':
      return 'Create new Web Service';
    default:
      return 'Create new Application';
  }
});

const steps = [
  {
    label: 'Import repository',
  },
  {
    label: 'Configure',
  },
  {
    label: 'Deploy',
  }
];
</script>

<style scoped>
@reference "~/assets/css/main.css";

.step {
  @apply w-8 h-8 text-xs rounded-full flex items-center justify-center text-white mr-3 bg-muted;
}

.step.active {
  @apply bg-inverted text-inverted;
}

.step.completed {
  @apply ring ring-inset ring-success/25 bg-success/10 text-success;
}

.separator {
  @apply w-12 h-px bg-muted mx-4;
}
</style>