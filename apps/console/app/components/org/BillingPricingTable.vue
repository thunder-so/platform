<template>
  <fieldset>
    <div class="flex gap-4 my-4 justify-center">
      <UCard
        v-for="plan in plans"
        :key="plan.id"
        class="flex-1 flex flex-col border border-muted rounded-none p-4"
        :class="{ 
          'border-success bg-success/5': currentPlan === plan.id,
          'border-primary': selectedPlan === plan.id && currentPlan !== plan.id
        }"
      >
        <template #header>
          <div>
            <h2 class="text-md">{{ plan.name }}</h2>
            <p class="text-sm text-muted">{{ plan.description }}</p>
          </div>
        </template>
        
        <div class="min-h-42">
          <div class="text-2xl my-2">
            <div v-if="isFree(plan as any)">
              <ul class="feature-list">
                <li>1 AWS account</li>
                <li>Unlimited apps</li>
              </ul>
              <span>{{ priceDisplay(plan as any).label }}</span>
              <span class="block text-sm text-muted">Free for life</span>
            </div>
            <div v-else-if="isSeatBased(plan as any)">
              <ul class="feature-list">
                <li>Unlimited AWS accounts</li>
                <li>Unlimited apps</li>
                <li>Priority support</li>
              </ul>
              <span>{{ priceDisplay(plan as any).label }}</span>
              <span class="block text-sm text-muted">per seat per {{ getPrimaryPrice(plan?.metadata as any)?.recurring_interval }}</span>
            </div>
            <div v-else-if="isOneTime(plan as any)">
              <ul class="feature-list">
                <li>Unlimited team members</li>
                <li>Unlimited AWS accounts</li>
                <li>Priority support for life</li>
              </ul>
              <span>{{ priceDisplay(plan as any).label }}</span>
              <span class="block text-sm text-muted">one-time payment</span>
              <p>
                <span class="text-xs text-muted italic">Available only during beta</span>
              </p>
            </div>
          </div>
        </div>

        <template #footer>
          <div v-if="isLifetimePlan">
            <UButton v-if="currentPlan === plan.id" color="success" variant="soft" size="lg" block disabled>
              Current Plan
            </UButton>
            <UButton v-else color="neutral" variant="outline" size="lg" block disabled>
              Not Available
            </UButton>
          </div>
          <div v-else>
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
          </div>
        </template>
      </UCard>
    </div>
  </fieldset>
  <!-- <div>
    <p class="text-sm text-muted">View <a href="https://thunder.so/pricing" target="_blank">pricing details</a>.</p>
  </div> -->
</template>

<script setup lang="ts">
import type { Product } from '~~/server/db/schema';
import { computed } from 'vue';
import { usePolar } from '~/composables/usePolar';

const { isFree, isSeatBased, isOneTime, priceDisplay, getPrimaryPrice } = usePolar();

const props = defineProps({
  plans: {
    type: Array as () => readonly Product[],
    required: true,
  },
  selectedPlan: {
    type: String,
    default: null,
  },
  currentPlan: {
    type: String,
    default: null,
  },
  disableSelection: {
    type: Boolean,
    default: false,
  }
});

const isLifetimePlan = computed(() => {
  if (!props.currentPlan || !props.plans.length) return false;
  const current = props.plans.find(p => p.id === props.currentPlan);
  if (!current) return false;

  return isOneTime(current as any);
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