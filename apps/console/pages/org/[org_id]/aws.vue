<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">AWS Accounts</h2>

      <UDropdownMenu :items="addNewItems">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          :trailing-icon="limitReached ? 'i-lucide-lock' : 'i-lucide-chevron-down'"
          label="Add New"
          :disabled="limitReached"
        />
      </UDropdownMenu>
    </div>

    <UAlert
      v-if="limitReached"
      icon="i-lucide-info"
      color="info"
      variant="soft"
      title="Upgrade to add more AWS Accounts"
      description="The Free plan is limited to 1 AWS Account. Upgrade your plan to add more."
      class="mb-4"
    />

    <div v-if="loading">Loading AWS accounts...</div>
    <div v-else-if="error">Error loading AWS accounts: {{ error.message }}</div>
    <div v-else-if="providers.length">
      <UTable :data="providers" :columns="columns">
        <template #action-cell="{ row }">
          <UDropdownMenu :items="getDropdownActions(row.original)">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              aria-label="Actions"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>
    <div v-else>
      <p>No AWS accounts connected yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'
import { ProviderCreateStackModal, ProviderCreateCredentialsModal } from '#components'
import { computed } from 'vue';

definePageMeta({
  layout: 'org'
})

const supabase = useSupabaseClient()
const { selectedOrganization, currentPlan } = useMemberships()
const { $client } = useNuxtApp()
const toast = useToast()
const { copy } = useClipboard()
const overlay = useOverlay()

const providers = ref([])
const loading = ref(false)
const error = ref<{ message: string } | null>(null);
const orgId = selectedOrganization.value?.id as string;

const maxProviders = computed(() => {
  // Defensive: fallback to 1 if not present
  return currentPlan.value?.metadata?.metadata?.max_providers ?? 1;
});
const limitReached = computed(() => providers.value.length >= maxProviders.value);

const UBadge = resolveComponent('UBadge')
const providerCreateStackModal = overlay.create(ProviderCreateStackModal);
const providerCreateCredentialsModal = overlay.create(ProviderCreateCredentialsModal);
const providerEditModal = resolveComponent('ProviderUpdateModal')
const providerDeleteModal = resolveComponent('ProviderDeleteModal')

const addNewAccountStack = () => {
  providerCreateStackModal.open({ organizationId: orgId })
};
const addNewAccountCredentials = () => {
  providerCreateCredentialsModal.open({ organizationId: orgId })
};

const addNewItems: DropdownMenuItem[] = [
  {
    label: 'Using Access Key',
    icon: 'material-symbols:key-outline',
    onSelect: addNewAccountCredentials
  },
  {
    label: 'Using CloudFormation',
    icon: 'mdi:aws',
    onSelect: addNewAccountStack
  }
]

export type Provider = {
  id: string,
  alias: string,
  account_id: string,
  region: string,
  role_arn: string,
  stack_id: string,
  stack_name: string,
  access_key_id: string,
  updated_at: string,
  created_at: string,
}

function getDropdownActions(provider: Provider): DropdownMenuItem[][] {
  const linkToStack = []
  if (provider.stack_id) {
    linkToStack.push({
      label: 'View stack in CloudFormation',
      icon: 'mdi:aws',
      onSelect: () => {
        window.open(`https://console.aws.amazon.com/go/view?arn=${provider.stack_id}`, '_blank')
      }
    }, {
      label: 'Edit IAM Role',
      icon: 'mdi:aws',
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
        icon: 'i-lucide-edit',
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
        icon: 'i-lucide-trash',
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
  { accessorKey: 'alias', header: 'Alias' },
  {
    accessorKey: 'access_key_id',
    header: 'Type',
    cell: ({ row }) => {
      if (row.original.stack_name) {
        return h(UBadge, { color: 'primary', variant: 'subtle' }, () => 'CLOUDFORMATION')
      } else if (row.original.access_key_id) {
        return h(UBadge, { color: 'secondary', variant: 'subtle' }, () => 'ACCESS KEY')
      }
    }
  },
  { accessorKey: 'account_id', header: 'Account ID' },
  { 
    accessorKey: 'updated_at', 
    header: 'Last Updated',
    cell: ({ row }) => {
      return new Date(row.getValue('updated_at')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
  },
  {
    id: 'action'
  }
];

const fetchProviders = async () => {
  loading.value = true
  try {
    const { data, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('organization_id', orgId as string)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (fetchError) throw fetchError
    providers.value = data
  } catch (e: any) {
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
