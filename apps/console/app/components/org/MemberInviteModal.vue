<template>
  <UModal title="Invite Member" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <UForm :schema="schema" :state="state" @submit.prevent="inviteMember" class="flex items-center space-x-2 mt-2">
          <UFormField name="emailToInvite" label="Enter email address" class="flex-grow">
            <UInput v-model="state.emailToInvite" placeholder="member@example.com" size="lg" class="w-full" />
          </UFormField>
        </UForm>
        <p v-if="error" class="text-red-500 mt-2">{{ error.message }}</p>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton label="Close" color="neutral" variant="outline" @click="close" />
      <UButton @click="inviteMember" :loading="inviting">Invite</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { z } from 'zod';
import { TRPCClientError } from '@trpc/client'

const { $client, $posthog } = useNuxtApp();
const props = defineProps<{ organizationId: string }>();
const emit = defineEmits<{ close: [boolean] }>();

const inviting = ref(false);
const error = ref<{ message: string } | null>(null);
const schema = z.object({
  emailToInvite: z.string().email('Invalid email address'),
});
const state = reactive({
  emailToInvite: ''
});

const inviteMember = async () => {
  inviting.value = true;
  error.value = null;
  
  try {
    await $client.team.inviteMember.mutate({ organizationId: props.organizationId, email: state.emailToInvite });
    $posthog().capture('member_invited', {
      org_id: props.organizationId,
      invited_email: state.emailToInvite
    });
    state.emailToInvite = '';
    emit('close', true);
  } catch (e: any) {
    $posthog().capture('member_invite_failed', {
      org_id: props.organizationId,
      error: e.message
    });
    if (e instanceof TRPCClientError) {
      error.value = { message: e.message };
    } else {
      error.value = { message: 'An unexpected error occurred' };
    }
  } finally {
    inviting.value = false;
  }
};
</script>
