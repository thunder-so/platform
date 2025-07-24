<template>
  <div>
    <div class="mb-4">
      <UCard variant="subtle">
        <template #header>
          <h3 class="text-lg font-medium">Invite Member</h3>
        </template>

        <UForm :schema="schema" :state="state" @submit.prevent="inviteMember" class="flex items-center space-x-2 mt-2">
          <UFormField name="emailToInvite" class="flex-grow">
            <UInput v-model="state.emailToInvite" placeholder="member@example.com" />
          </UFormField>
        </UForm>
        <p v-if="inviteError" class="text-red-500 mt-2">{{ inviteError.message }}</p>

        <template #footer>
          <UButton type="submit" :loading="inviting">Invite</UButton>
        </template>
      </UCard>
    </div>

    <div v-if="isLoading">Loading members...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <h3 class="text-lg font-medium mb-2">Active Members</h3>
      <UTable
        v-if="activeMembers.length"
        :data="activeMembers"
        :columns="columns"
      >
        <template #actions-data="{ row }">
          <UButton color="warning" variant="soft" @click="removeMember(row.id)" :loading="removingMemberId === row.id">Remove</UButton>
        </template>
      </UTable>
      <div v-else class="text-gray-500">No active members.</div>

      <h3 class="text-lg font-medium mt-6 mb-2">Pending Invitations</h3>
      <UTable
        v-if="pendingMembers.length"
        :data="pendingMembers"
        :columns="columns"
      >
        <template #actions-data="{ row }">
          <UButton color="warning" variant="soft" @click="removeMember(row.id)" :loading="removingMemberId === row.id">Cancel Invite</UButton>
        </template>
      </UTable>
      <div v-else class="text-gray-500">No pending invitations.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { z } from 'zod';

const route = useRoute();
const supabase = useSupabaseClient();
const { selectedOrganization } = useMemberships()
const { $client } = useNuxtApp();

definePageMeta({
  layout: 'org',
});

const orgId = selectedOrganization?.value?.id as string;
const inviting = ref(false);
const inviteError = ref(null);
const removingMemberId = ref(null);

const members = ref([]);
const isLoading = ref(false);
const error = ref(null);

const UAvatar = resolveComponent('UAvatar')

const columns = [
  {
    accessorKey: 'user.avatar_url',
    header: '',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, {
          src: row.original.user.avatar_url,
          alt: row.original.user.full_name,
          size: 'sm'
        }),
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted' }, row.original.user.full_name),
        ])
      ])
    }
  },
  {
    accessorKey: 'user.email',
    header: 'Email',
    // cell: ({ row }) => row.user.email
  },
  // {
  //   accessorKey: 'access',
  //   header: 'Access',
  //   // cell: ({ row }) => row.access
  // },
  {
    accessorKey: 'actions',
    header: 'Actions',
  }
];

const activeMembers = computed(() => members.value.filter(m => !m.pending));
const pendingMembers = computed(() => members.value.filter(m => m.pending));

const schema = z.object({
  emailToInvite: z.string().email('Invalid email address'),
});

const state = reactive({
  emailToInvite: ''
});

const fetchMembers = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('memberships')
      .select(`
        id,
        access,
        pending,
        user:users (id, email, full_name, avatar_url)
      `)
      .eq('organization_id', orgId);

    if (fetchError) throw fetchError;
    members.value = data;
  } catch (e) {
    error.value = e;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchMembers();
});

const inviteMember = async () => {
  inviting.value = true;
  inviteError.value = null;
  try {
    await $client.team.inviteMember.mutate({ organizationId: orgId, email: state.emailToInvite });
    state.emailToInvite = '';
    await fetchMembers();
  } catch (e: any) {
    inviteError.value = e;
  } finally {
    inviting.value = false;
  }
};

const removeMember = async (membershipId: any) => {
  removingMemberId.value = membershipId;
  try {
    await $client.team.removeMember.mutate({ membershipId });
    await fetchMembers();
  } catch (e) {
    console.error('Failed to remove member:', e);
    alert('Failed to remove member. See console for details.');
  } finally {
    removingMemberId.value = null;
  }
};
</script>
