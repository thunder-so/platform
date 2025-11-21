<template>
  <UModal title="Cancel Invitation" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <UAlert
          icon="tabler:info-circle"
          color="warning"
          variant="soft"
          title="This will cancel the pending invitation"
          description="The invited user will no longer be able to join using this invitation."
        />
      </div>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Keep Invitation" color="neutral" variant="outline" @click="close" />
      <UButton 
        label="Cancel Invitation" 
        color="error" 
        :loading="isDeleting"
        @click="handleDelete"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const { $client } = useNuxtApp();
const toast = useToast();

const props = defineProps<{
  invite: any;
}>();

const emit = defineEmits<{
  close: [success: boolean];
}>();

const isDeleting = ref(false);

const handleDelete = async () => {
  isDeleting.value = true;
  try {
    await $client.team.removeInvite.mutate({ inviteId: props.invite.id });
    toast.add({ 
      title: 'Invitation cancelled successfully', 
      color: 'success' 
    });
    emit('close', true);
  } catch (error: any) {
    toast.add({ 
      title: 'Failed to cancel invitation', 
      description: error.message,
      color: 'error' 
    });
  } finally {
    isDeleting.value = false;
  }
};
</script>