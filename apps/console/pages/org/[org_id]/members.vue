<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">Members</h3>
      <UButton 
        color="neutral" 
        variant="outline" 
        size="lg" 
        :trailing-icon="limitReached ? 'i-lucide-lock' : 'i-lucide-user-plus'"
        label="Invite Member" 
        @click="openInviteModal" 
        :disabled="limitReached"
      />
    </div>

    <UAlert
      v-if="limitReached"
      icon="i-lucide-info"
      color="info"
      variant="soft"
      title="Upgrade to add more team members"
      description="The Hobby plan is limited to 1 member. Upgrade your plan to add more."
      class="mb-4"
    />
    <div v-if="isLoading">Loading members...</div>
    <div v-else-if="error">
      <UAlert color="warning" variant="soft" :title="error.message" class="mb-4" />
    </div>
    <div v-else>
      <UTable :data="sortedMembers" :columns="columns">
        <template #status-cell="{ row }">
          <UBadge :color="row.original.pending ? 'secondary' : 'success'" variant="subtle">
            {{ row.original.pending ? 'INVITED' : 'ACTIVE' }}
          </UBadge>
        </template>
      </UTable>
      <div v-if="!sortedMembers.length" class="text-gray-500">No members or invitations.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import { useMemberships } from '~/composables/useMemberships';
import { TRPCClientError } from '@trpc/client';

definePageMeta({
  layout: 'org',
});

const supabase = useSupabaseClient();
const { selectedOrganization, currentPlan } = useMemberships();
const { $client } = useNuxtApp();
const overlay = useOverlay();
const toast = useToast()
const MemberInviteModal = resolveComponent('MemberInviteModal');
const UAvatar = resolveComponent('UAvatar');
const UBadge = resolveComponent('UBadge');
const orgId = selectedOrganization?.value?.id as string;
const maxMembers = computed(() => {
  return currentPlan.value?.metadata?.metadata?.max_members ?? 1;
});
const limitReached = computed(() => members.value.length >= maxMembers.value);

const removingMemberId = ref<number | null>(null);
const members = ref<any[]>([]);
const isLoading = ref(false);
const error = ref<{ message: string } | null>(null);

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
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: undefined // handled by slot
  },
  {
    id: 'action',
    cell: ({ row }) => h('div', { class: 'text-right' }, [
      h(resolveComponent('UDropdownMenu'), { items: getDropdownActions(row.original) }, () =>
        h(resolveComponent('UButton'), {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          'aria-label': 'Actions',
          disabled: removingMemberId.value === row.original.id
        })
      )
    ])
  }
];

const sortedMembers = computed(() => {
  // Sort: active first, then invited
  return [...members.value].sort((a, b) => {
    return a.pending ? 1 : -1;
  });
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
      .eq('organization_id', orgId)
      .order('pending', { ascending: true }); // Only order by top-level field

    if (fetchError) throw fetchError;
    members.value = data;
  } catch (e:any) {
    error.value = { message: e.message };
  } finally {
    isLoading.value = false;
  }
};

function getDropdownActions(member: any) {
  if (!member.pending) {
    return [[
      {
        label: 'Remove Member',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect: async () => {
          removingMemberId.value = member.id;
          try {
            await $client.team.removeMember.mutate({ membershipId: member.id });
            toast.add({ title: 'Member removed successfully!', color: 'success' });
            await fetchMembers();
          } catch (e: any) {
            toast.add({ title: 'Failed to remove member', color: 'error' });
          } finally {
            removingMemberId.value = null;
          }
        }
      }
    ]];
  } else {
    return [[
      {
        label: 'Cancel Invite',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect: async () => {
          removingMemberId.value = member.id;
          try {
            await $client.team.removeMember.mutate({ membershipId: member.id });
            toast.add({ title: 'Invitation cancelled!', color: 'success' });
            await fetchMembers();
          } catch (e: any) {
            toast.add({ title: 'Failed to cancel invite', color: 'error' });
          } finally {
            removingMemberId.value = null;
          }
        }
      }
    ]];
  }
}

onMounted(() => {
  fetchMembers();
});

const openInviteModal = async () => {
  const modal = overlay.create(MemberInviteModal, {
    props: { organizationId: orgId }
  });
  const result = await modal.open().result;
  if (result) {
    await fetchMembers();
  }
};
</script>
