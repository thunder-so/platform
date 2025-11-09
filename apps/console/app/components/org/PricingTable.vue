<template>
  <fieldset>
    <div class="flex gap-4 my-4 justify-center">
      <UCard
        v-for="plan in plans"
        :key="plan.id"
        class="flex-1 flex flex-col border border-muted rounded-none p-4"
        :class="{ 'border-success': selectedPlan === plan.id }"
      >
        <template #header>
          <h2 class="text-xl font-bold">{{ plan.name }}</h2>
          <p class="text-sm color-gray-500">{{ plan.description }}</p>

          <div class="text-2xl my-4">
            <p v-if="plan.id === 'free'">
              <span>${{ plan?.metadata.prices[0]?.price_amount / 100 }} <span class="uppercase">{{ plan?.metadata.prices[0]?.price_currency }}</span></span>
            </p>
            <p v-else-if="plan?.metadata.prices[0]?.amount_type === 'free'">
              <span>Free</span>
            </p>
            <p v-else-if="plan?.metadata.prices[0]?.amount_type === 'seat_based'">
              <span>${{ plan?.metadata.prices[0]?.price_per_seat / 100 }} <span class="uppercase">{{ plan?.metadata.prices[0]?.price_currency }}</span></span>
              <span class="block text-sm">per {{ plan.metadata.prices[0]?.recurring_interval }} per seat</span>
            </p>
            <p v-else>
              <span>${{ plan?.metadata.prices[0]?.price_amount / 100 }} <span class="uppercase">{{ plan?.metadata.prices[0]?.price_currency }}</span></span>
              <span class="block text-sm">per {{ plan.metadata.prices[0]?.recurring_interval }}</span>
            </p>
          </div>
        </template>

        <template #footer>
          <UButton
            type="button"
            :variant="selectedPlan === plan.id ? 'solid' : 'outline'"
            :color="selectedPlan === plan.id ? 'primary' : 'neutral'"
            :disabled="selectedPlan === plan.id || disableSelection"
            @click="emit('update:selectedPlan', plan.id)"
            size="lg"
            block
          >
            {{ selectedPlan === plan.id ? 'Selected' : 'Select Plan' }}
          </UButton>
        </template>
      </UCard>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { Product } from '~~/server/db/schema';

const props = defineProps({
  plans: {
    type: Array as () => readonly Product[],
    required: true,
  },
  selectedPlan: {
    type: String,
    default: null,
  },
  disableSelection: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:selectedPlan']);
</script>