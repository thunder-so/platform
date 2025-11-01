<template>
  <UModal title="Remove Member" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="isLastMember"
          icon="i-lucide-alert-triangle"
          color="error"
          variant="soft"
          title="Cannot remove last member"
          description="Organizations must have at least one member. This action would leave the organization without any members."
        />
        
        <UAlert
          v-else-if="isBillingOwner"
          icon="i-lucide-credit-card"
          color="error"
          variant="soft"
          title="Cannot remove billing owner"
          description="This member manages the organization's subscription. Transfer billing ownership before removing them."
        />
        
        <div v-else>
          <p class="text-sm text-gray-600">
            Are you sure you want to remove <strong>{{ member.user.full_name || member.user.email }}</strong> from this organization?
          </p>
          <UAlert
            icon="i-lucide-alert-triangle"
            color="warning"
            variant="soft"
            title="This action cannot be undone"
            description="The member will lose access to all applications and resources in this organization."
            class="mt-3"
          />
        </div>
      </div>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton 
        label="Remove Member" 
        color="error" 
        :loading="isDeleting"
        :disabled="!canDelete"
        @click="handleDelete"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const { $client } = useNuxtApp();
const { selectedOrganization } = useMemberships();
const toast = useToast();

const props = defineProps<{
  member: any;
  totalMembers: number;
}>();

const emit = defineEmits<{
  close: [success: boolean];
}>();

const isDeleting = ref(false);

const isLastMember = computed(() => props.totalMembers <= 1);

const isBillingOwner = computed(() => {
  const org = selectedOrganization.value;
  if (!org?.subscriptions?.length) return false;
  
  // For now, we'll use a simpler check - if org has active subscription
  // and this is an admin, assume they could be billing owner
  // This can be enhanced later with more specific billing owner tracking
  return org.subscriptions.some(sub => sub.status === 'active') && 
         props.member.access === 'ADMIN';
});

const canDelete = computed(() => !isLastMember.value && !isBillingOwner.value);

const handleDelete = async () => {
  if (!canDelete.value) return;
  
  isDeleting.value = true;
  try {
    await $client.team.removeMember.mutate({ membershipId: props.member.id });
    toast.add({ 
      title: 'Member removed successfully', 
      color: 'success' 
    });
    emit('close', true);
  } catch (error: any) {
    toast.add({ 
      title: 'Failed to remove member', 
      description: error.message,
      color: 'error' 
    });
  } finally {
    isDeleting.value = false;
  }
};
</script>