<template>
  <UModal 
    title="Confirm plan downgrade"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UAlert 
        color="warning" 
        variant="soft"
        title="Downgrading to Free Plan"
        description="This will may affect team access."
        class="mb-4"
      />
      
      <div class="space-y-2">
        <h4>What happens next:</h4>
        <ul class="list-disc list-inside text-sm text-muted space-y-1">
          <li>Your plan will be downgraded immediately</li>
          <li>No charges will be applied for the free plan</li>
          <li>Team members beyond the free limit will lose access</li>
          <li>You can access all your AWS accounts but will not be able to add any more</li>
        </ul>
      </div>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton label="Confirm Downgrade" color="warning" :loading="isProcessing" @click="confirm" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Product, Subscription } from '~~/server/db/schema';

const props = defineProps<{
  targetPlan: Product | null;
  currentSubscription: Subscription | null;
  organizationId: string;
}>();

const emit = defineEmits<{
  close: [result?: boolean];
}>();

const { $client } = useNuxtApp();
const toast = useToast();
const isProcessing = ref(false);

const confirm = async () => {
  if (!props.targetPlan) return;
  
  isProcessing.value = true;
  try {
    await $client.organizations.switchToFreePlan.mutate({
      organizationId: props.organizationId,
      productId: props.targetPlan.id,
    });
    
    toast.add({
      title: 'Plan Downgraded',
      description: 'Successfully downgraded to free plan.',
      color: 'success',
    });
    
    emit('close', true);
  } catch (e) {
    console.error('Error downgrading plan:', e);
    toast.add({
      title: 'Error',
      description: 'Failed to downgrade plan. Please try again.',
      color: 'error',
    });
  } finally {
    isProcessing.value = false;
  }
};
</script>