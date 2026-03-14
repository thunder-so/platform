<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">AWS Accounts</h3>
      <UDropdownMenu :items="addNewItems">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          :trailing-icon="isFree ? 'tabler:lock' : 'tabler:chevron-down'"
          label="Add New"
          :disabled="isFree"
        />
      </UDropdownMenu>
    </div>

    <UAlert
      v-if="isFree && limitReached"
      icon="tabler:info-circle"
      color="info"
      variant="soft"
      title="Upgrade to add more AWS Accounts"
      description="The free plan is limited to 1 AWS Account. Upgrade your plan to add more."
      class="mb-4"
      :actions="[{ label: 'Upgrade', color: 'primary', to: `/org/${orgId}/billing` }]"
    />

    <div v-if="loading">
      <div class="flex flex-col gap-4 mt-7">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-6 w-full" />
        </div>
      </div>
    </div>
    <div v-else-if="error">
      <UAlert
        class="mb-4"
        color="error"
        variant="soft"
        title="Error loading AWS accounts"
        description="There was an issue fetching your AWS accounts. Please try again later."
        icon="tabler:alert-triangle"
      />
    </div>
    <div v-else-if="providers.length">
      <UTable :data="providers" :columns="columns" />
    </div>
    <div v-else>
      <UEmpty
        icon="tabler:brand-aws"
        title="No AWS accounts connected"
        description="Connect an AWS account to manage cloud resources for this organization."
      >
        <template #actions>
          <UDropdownMenu :items="addNewItems">
            <UButton color="primary" variant="solid" label="Add AWS Account" />
          </UDropdownMenu>
        </template>
      </UEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui';
import type { Provider } from '~~/server/db/schema';
import { OrgProviderCreateStackModal, OrgProviderCreateCredentialsModal } from '#components';
import { computed } from 'vue';
import { usePolar } from '~/composables/usePolar';

definePageMeta({
  layout: 'org'
})

const supabase = useSupabaseClient()
const { selectedOrganization, currentPlan } = useMemberships()
const { isFree: isFreeFn } = usePolar();
const { $client } = useNuxtApp()
const toast = useToast()
const overlay = useOverlay()

const providers = ref<Provider[]>([])
const loading = ref(true)
const error = ref<{ message: string } | null>(null);
const orgId = selectedOrganization.value?.id as string;
const limitReached = computed(() => providers.value.length >= 1);
const isFree = computed(() => isFreeFn(currentPlan.value as any));

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')
const providerCreateStackModal = overlay.create(OrgProviderCreateStackModal);
const providerCreateCredentialsModal = overlay.create(OrgProviderCreateCredentialsModal);
const providerEditModal = resolveComponent('OrgProviderUpdateModal') as Component
const providerDeleteModal = resolveComponent('OrgProviderDeleteModal') as Component

const addNewAccountStack = () => {
  const { $posthog } = useNuxtApp();
  $posthog().capture('aws_connection_started', {
    method: 'cloudformation',
    org_id: orgId
  });
  providerCreateStackModal.open({ organizationId: orgId })
};

const addNewAccountCredentials = async () => {
  const { $posthog } = useNuxtApp();
  $posthog().capture('aws_connection_started', {
    method: 'access_key',
    org_id: orgId
  });
  const result = await providerCreateCredentialsModal.open({ organizationId: orgId }).result;
  if (result) {
    fetchProviders();
  }
};

const addNewItems: DropdownMenuItem[] = [
  {
    label: 'Using Access Key',
    icon: 'tabler:key',
    onSelect: addNewAccountCredentials
  },
  {
    label: 'Using CloudFormation',
    icon: 'tabler:brand-aws',
    onSelect: addNewAccountStack
  }
]

function getDropdownActions(provider: Provider): DropdownMenuItem[][] {
  const linkToStack = []
  if (provider.stack_id) {
    linkToStack.push({
      label: 'View stack in CloudFormation',
      icon: 'tabler:brand-aws',
      onSelect: () => {
        window.open(`https://console.aws.amazon.com/go/view?arn=${provider.stack_id}`, '_blank')
      }
    }, {
      label: 'Edit IAM Role',
      icon: 'tabler:brand-aws',
      onSelect: () => {
        window.open(`https://console.aws.amazon.com/go/view?arn=${provider.role_arn}`, '_blank')
      }
    })
  }

  return [
    ... (linkToStack.length ? [linkToStack] : []),
    [
      {
        label: 'Edit',
        icon: 'tabler:edit',
        onSelect: async () => {
          const modal = overlay.create(providerEditModal, {
            props: { provider }
          })
          
          const result = await modal.open().result
          
          if (result) {
            await updateProvider(provider.id, result)
          }
        }
      },
      {
        label: 'Delete',
        icon: 'tabler:trash',
        color: 'error',
        onSelect: async () => {
          // Check for associated environments
          const { data: environments, error } = await supabase
            .from('environments')
            .select('id')
            .eq('provider_id', provider.id)
            .is('deleted_at', null)
            .limit(1);

          if (error) {
            toast.add({ title: 'Error checking for environments', color: 'error' });
            return;
          }

          const mode = (environments && environments.length > 0) ? 'cannotDelete' : 'confirmDelete';

          const modal = overlay.create(providerDeleteModal, {
            props: { provider, mode },
          });

          const result = await modal.open().result;

          if (result) {
            await deleteProvider(provider.id);
          }
        }
      }
    ]
  ]
}

const columns = [
  { 
    accessorKey: 'alias', 
    header: 'Alias',
    cell: ({ row }: { row: { original: Provider } }) => {
      return h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.alias || 'Unnamed'),
      ])
    }
  },
  {
    accessorKey: 'access_key_id',
    header: 'Type',
    cell: ({ row }: { row: { original: Provider } }) => {
      if (row.original.stack_name) {
        return h(UBadge, { color: 'success', variant: 'subtle' }, () => 'CLOUDFORMATION')
      } else if (row.original.access_key_id) {
        return h(UBadge, { color: 'secondary', variant: 'subtle' }, () => 'ACCESS KEY')
      }
    }
  },
  { accessorKey: 'account_id', header: 'Account ID' },
  { 
    accessorKey: 'updated_at', 
    header: 'Last Updated',
    cell: ({ row }: { row: { original: Provider } }) => {
      const date = row.original.updated_at || row.original.created_at;
      return new Date(date).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  },
  {
    id: 'action',
    cell: ({ row }: { row: { original: Provider } }) => h('div', { class: 'text-right' }, [
      h(UDropdownMenu, { items: getDropdownActions(row.original) }, () =>
        h(UButton, {
          icon: 'tabler:dots-vertical',
          color: 'neutral',
          variant: 'ghost',
          'aria-label': 'Actions'
        })
      )
    ])
  }
];

const fetchProviders = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('organization_id', orgId as string)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (fetchError) throw fetchError
    providers.value = data.map(provider => ({
      ...provider,
      created_at: new Date(provider.created_at),
      updated_at: provider.updated_at ? new Date(provider.updated_at) : null,
      deleted_at: provider.deleted_at ? new Date(provider.deleted_at) : null,
    }))
  } catch (e: any) {
    const { $posthog } = useNuxtApp();
    $posthog().capture('aws_providers_fetch_failed', {
      error: e.message,
      org_id: orgId
    });
    error.value = e
  } finally {
    loading.value = false
  }
}

const updateProvider = async (providerId: string, newAlias: string) => {
  try {
    const { error } = await supabase
      .from('providers')
      .update({ 
        alias: newAlias,
        updated_at: new Date().toISOString() 
      })
      .eq('id', providerId)

    if (error) throw error
    
    toast.add({
      title: 'Account alias updated successfully!',
      color: 'success'
    })
    
    fetchProviders() // Refresh the list
  } catch (e: any) {
    toast.add({
      title: 'Failed to update account alias',
      color: 'error'
    })
  }
}

const deleteProvider = async (providerId: string) => {
  try {
    // Call the tRPC mutation to soft-delete the provider.
    await $client.providers.delete.mutate({
      providerId: providerId,
    });
    
    toast.add({
      title: 'Account deleted successfully!',
      color: 'success'
    })
    
    fetchProviders() // Refresh the list
  } catch (e: any) {
    toast.add({
      title: 'Failed to delete account',
      color: 'error'
    })
  }
};

onMounted(() => {
  if (selectedOrganization.value) {
    fetchProviders()

    // Realtime subscription
    supabase
      .channel(`organization_providers:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'providers', filter: `organization_id=eq.${orgId}` }, payload => {
        console.info('Change received!', payload)
        if (payload.eventType === 'INSERT') {
          const { $posthog } = useNuxtApp();
          $posthog().capture('aws_account_connected', {
            provider_id: payload.new.id,
            method: payload.new.stack_name ? 'cloudformation' : 'access_key',
            account_id: payload.new.account_id,
            region: payload.new.region,
            org_id: orgId
          });
        }
        fetchProviders() // Re-fetch providers on any change
      })
      .subscribe()
  }
})

onUnmounted(() => {
  // Unsubscribe from realtime channel when component is unmounted
  supabase.removeAllChannels()
})
</script>
