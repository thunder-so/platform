<template>
  <fieldset>
    <legend class="text-lg font-semibold mb-2">Choose a plan:</legend>
    <div class="pricing-table">
      <UCard
        v-for="plan in plans"
        :key="plan.id"
        class="pricing-column"
        :class="{ 'border-primary-500 ring-2 ring-primary-500': selectedPlan === plan.id }"
      >
        <template #header>
          <h2 class="text-xl font-bold">{{ plan.name }}</h2>
        </template>
        <!-- <p class="description">{{ plan.description }}</p> -->
        <div class="price text-2xl font-bold my-4">{{ plan.price }}</div>
        <UButton
          type="button"
          :variant="selectedPlan === plan.id ? 'solid' : 'outline'"
          :color="selectedPlan === plan.id ? 'primary' : 'gray'"
          :disabled="selectedPlan === plan.id || disableSelection"
          @click="selectPlan(plan.id)"
          block
        >
          {{ selectedPlan === plan.id ? 'Selected' : 'Select Plan' }}
        </UButton>
      </UCard>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
const props = defineProps({
  plans: {
    type: Array,
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

const emit = defineEmits(['update:selectedPlan', 'selectPlan']);

const selectPlan = (planId) => {
  emit('update:selectedPlan', planId);
  emit('selectPlan', planId);
};
</script>

<style scoped>
.pricing-table {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  justify-content: center;
}

.pricing-column {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  flex: 1;
  max-width: 300px;
  display: flex;
  flex-direction: column;
}

.pricing-column .price {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1rem 0;
}
</style>
