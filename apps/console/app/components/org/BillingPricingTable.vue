<template>
  <fieldset>
    <div class="flex gap-4 my-4 justify-center">
      <UCard
        v-for="plan in plans"
        :key="plan.id"
        class="flex-1 flex flex-col border border-muted rounded-none p-4"
        :class="{
          'border-success bg-success/5': currentPlan === plan.id,
          'border-primary': selectedPlan === plan.id && currentPlan !== plan.id,
        }"
      >
        <template #header>
          <h2 class="text-md">{{ plan.name }}</h2>
          <p class="text-sm text-muted">{{ plan.description }}</p>
        </template>

        <div class="min-h-42">
          <ul class="feature-list">
            <li>Unlimited AWS accounts</li>
            <li>Unlimited apps</li>
            <li>Unlimited team members</li>
            <li>Priority support</li>
          </ul>
          <span class="text-2xl">{{ priceDisplay(plan as any).label }}</span>
          <p v-if="(plan as any)?.metadata?.trial_interval_count && (plan as any)?.metadata?.trial_interval" class="mt-2">
            <span class="text-xs text-muted italic">{{ (plan as any).metadata.trial_interval_count }}-{{ (plan as any).metadata.trial_interval }} free trial</span>
          </p>
        </div>

        <template #footer>
          <UButton
            type="button"
            :variant="currentPlan === plan.id ? 'solid' : (selectedPlan === plan.id ? 'solid' : 'outline')"
            :color="currentPlan === plan.id ? 'success' : (selectedPlan === plan.id ? 'primary' : 'neutral')"
            :disabled="currentPlan === plan.id || disableSelection"
            @click="emit('update:selectedPlan', plan.id)"
            size="lg"
            block
          >
            {{ currentPlan === plan.id ? 'Current Plan' : (selectedPlan === plan.id ? 'Selected' : 'Select Plan') }}
          </UButton>
        </template>
      </UCard>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { Product } from '~~/server/db/schema';
import { usePolar } from '~/composables/usePolar';

const { priceDisplay } = usePolar();

const props = defineProps({
  plans: { type: Array as () => readonly Product[], required: true },
  selectedPlan: { type: String, default: null },
  currentPlan: { type: String, default: null },
  disableSelection: { type: Boolean, default: false },
});

const emit = defineEmits(['update:selectedPlan']);
</script>

<style scoped>
@reference "~/assets/css/main.css";

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.feature-list li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  @apply text-muted;
}

.feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #10b981;
  font-weight: bold;
}
</style>
