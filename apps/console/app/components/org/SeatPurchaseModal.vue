<template>
  <UModal title="Purchase Additional Seats" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Add more seats to your organization to invite more team members.
        </p>
        
        <div class="space-y-2">
           <UFormField label="Number of seats to add">
              <UInputNumber v-model="seatsToAdd" :min="1" :max="99" size="xl" />
           </UFormField>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-2 text-sm">
          <div class="flex justify-between">
            <span>Current Seats:</span>
            <span class="font-medium">{{ currentSeats }}</span>
          </div>
          <div class="flex justify-between">
            <span>Additional Seats:</span>
            <span class="font-medium text-primary">+{{ seatsToAdd || 0 }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <span>New Total Seats:</span>
            <span class="font-bold">{{ currentSeats + (seatsToAdd || 0) }}</span>
          </div>
          <div v-if="pricePerSeat > 0" class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 text-primary">
            <span>Cost Increase:</span>
            <span class="font-bold">{{ formatCurrency((seatsToAdd || 0) * pricePerSeat) }} / {{ billingPeriod }}</span>
          </div>
        </div>
        
        <UAlert v-if="error" color="error" variant="soft" :title="error" />
      </div>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="close" />
      <UButton 
        label="Purchase Seats" 
        color="primary" 
        :loading="isProcessing" 
        :disabled="!isValid"
        @click="confirm" 
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  organizationId: string;
  currentSeats: number;
  pricePerSeat: number;
  currency: string;
  billingPeriod: string;
}>();

const emit = defineEmits<{
  close: [result?: boolean];
}>();

const { $client, $posthog } = useNuxtApp();
const toast = useToast();

const seatsToAdd = ref(1);
const isProcessing = ref(false);
const error = ref<string | null>(null);

const isValid = computed(() => {
  return seatsToAdd.value !== null && seatsToAdd.value > 0;
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency.toUpperCase(),
  }).format(amount / 100);
};

const confirm = async () => {
  if (!isValid.value || seatsToAdd.value === null) return;
  
  isProcessing.value = true;
  error.value = null;
  
  try {
    const seats = seatsToAdd.value;
    const result = await $client.team.purchaseSeats.mutate({ 
      organizationId: props.organizationId, 
      additionalSeats: seats 
    });
    
    if (result.success) {
      $posthog().capture('seat_purchase_success', {
        org_id: props.organizationId,
        additional_seats: seats,
        current_seats: props.currentSeats + seats
      });
      
      toast.add({
        title: 'Success',
        description: `${seats} seat(s) purchased successfully.`,
        color: 'success'
      });
      
      emit('close', true);
    }
  } catch (e: any) {
    console.error('Failed to purchase seats:', e);
    $posthog().capture('seat_purchase_failed', {
      org_id: props.organizationId,
      error: e.message
    });
    error.value = e.message || 'Failed to purchase additional seats.';
  } finally {
    isProcessing.value = false;
  }
};
</script>
