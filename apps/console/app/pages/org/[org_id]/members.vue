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
      :title="seatUsage.isSeatBased ? 'No available seats' : 'Upgrade to add more team members'"
      :description="seatUsage.isSeatBased ? 'All seats are in use. Purchase more seats to invite members.' : 'The free plan is limited to 1 member. Upgrade your plan to add more.'"
      class="mb-4"
    />
    <div v-if="loading">
      <div class="flex flex-col gap-4 mt-7">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-6 w-full" />
        </div>
      </div>
    </div>
    <div v-else-if="error">
      <UAlert color="warning" variant="soft" :title="error.message" class="mb-4" />
    </div>
    <div v-else-if="sortedMembers.length > 0">
      <UTable :data="sortedMembers" :columns="columns">
        <template #status-cell="{ row }">
          <UBadge :color="row.original.pending ? 'secondary' : 'success'" variant="subtle">
            {{ row.original.pending ? 'INVITED' : 'ACTIVE' }}
          </UBadge>
        </template>
      </UTable>
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
const MemberInviteModal = resolveComponent('OrgMemberInviteModal');
const MemberDeleteModal = resolveComponent('OrgMemberDeleteModal');
const InviteDeleteModal = resolveComponent('OrgInviteDeleteModal');
const UAvatar = resolveComponent('UAvatar');
const UBadge = resolveComponent('UBadge');
const orgId = selectedOrganization?.value?.id as string;

const seatUsage = ref({ used: 0, total: 1, isSeatBased: false });
const limitReached = computed(() => {
  if (seatUsage.value.isSeatBased) {
    return seatUsage.value.used >= seatUsage.value.total;
  }
  return seatUsage.value.used >= seatUsage.value.total;
});

const members = ref<any[]>([]);
const loading = ref(true);
const error = ref<{ message: string } | null>(null);

const columns = [
  {
    accessorKey: 'user.avatar_url',
    header: 'Member',
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
          'aria-label': 'Actions'
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
      .is('deleted_at', null)
      .order('pending', { ascending: true });

    if (fetchError) throw fetchError;
    members.value = data;
  } catch (e:any) {
    error.value = { message: e.message };
  } finally {
    loading.value = false;
  }
};

function getDropdownActions(member: any) {
  if (!member.pending) {
    return [[
      {
        label: 'Remove Member',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect: () => openMemberDeleteModal(member)
      }
    ]];
  } else {
    return [[
      {
        label: 'Cancel Invite',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect: () => openInviteDeleteModal(member)
      }
    ]];
  }
}

const fetchSeatUsage = async () => {
  try {
    const usage = await $client.team.getSeatUsage.query({ organizationId: orgId });
    seatUsage.value = usage;
    console.log('Seat usage:', usage)
  } catch (e) {
    console.error('Error fetching seat usage:', e);
  }
};

onMounted(async () => {
  await fetchSeatUsage();
  fetchMembers();
});

const openInviteModal = async () => {
  const modal = overlay.create(MemberInviteModal as Component, {
    props: { organizationId: orgId }
  });
  const result = await modal.open().result;
  if (result) {
    await fetchMembers();
  }
};

const openMemberDeleteModal = async (member: any) => {
  const modal = overlay.create(MemberDeleteModal as Component, {
    props: { 
      member,
      totalMembers: members.value.filter(m => !m.pending).length
    }
  });
  const result = await modal.open().result;
  if (result) {
    await fetchMembers();
  }
};

const openInviteDeleteModal = async (invite: any) => {
  const modal = overlay.create(InviteDeleteModal as Component, {
    props: { invite }
  });
  const result = await modal.open().result;
  if (result) {
    await fetchMembers();
  }
};
</script>
