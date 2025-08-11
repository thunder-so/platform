<template>
  <div>
    <UCard>
      <template #header>
        <h3>Profile Settings</h3>
      </template>
      <div v-if="user">
        <UForm :schema="schema" :state="state" @submit.prevent="updateProfile" class="space-y-4 max-w-sm">
          <UFormField label="Display Name" name="newDisplayName">
            <UInput v-model="state.newDisplayName" placeholder="Enter new display name" />
          </UFormField>
        </UForm>
        <UAlert v-if="errorMessage" color="error" variant="soft" class="mt-4" :title="errorMessage" />
      </div>
      <template #footer>
        <UButton 
          type="submit" 
          @click="updateProfile" 
          :loading="loading" 
          :disabled="loading || !isFormValid || !hasChanges">
          Update
        </UButton>
      </template>
    </UCard>

    <UCard class="mt-8">
      <template #header>
        <h3>Github accounts</h3>
      </template>
      <div class="flex justify-between items-center mb-4">
        <UButton
          icon="i-lucide-plus" 
          :to="`https://github.com/apps/${githubApp}/installations/new?redirect_uri=${base}/profile`"
          target="_blank"
        >
          Import repositories
        </UButton>
      </div>
      <UTable :columns="columns" :data="installations">
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
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { z } from 'zod'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const loading = ref(false)
const errorMessage = ref('')
const installations = ref<any[]>([])
const toast = useToast()

definePageMeta({
  layout: 'org',
  middleware: ['github-middleware-client']
})

const githubApp = useRuntimeConfig().public.GITHUB_APP
const siteUrl = useRuntimeConfig().public.siteUrl
const base = useRequestURL().origin


const displayName = computed(() => user.value?.user_metadata?.full_name || 'N/A')
const isFormValid = computed(() => state.newDisplayName && state.newDisplayName.length >= 3)
const hasChanges = computed(() => state.newDisplayName !== displayName.value)

const schema = z.object({
  newDisplayName: z.string()
    .min(3, 'Must be at least 3 characters')
    .regex(/^[a-zA-Z0-9 ]+$/, 'Only letters, numbers, and spaces are allowed'),
})

type Schema = z.output<typeof schema>

const UBadge = resolveComponent('UBadge')

const state = reactive({
  newDisplayName: ''
})

function getDropdownActions(installation: any): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View on Github',
        icon: 'ei:sc-github',
        onSelect: () => {
          window.open(installation.metadata.html_url, '_blank')
        }
      }
    ],
  ]
}

const columns = [
  { accessorKey: 'metadata.account.login', header: 'Account' },
  { 
    accessorKey: 'metadata.target_type', 
    header: 'Type',
    cell: ({ row }) => {
      if (row.original.metadata.target_type === 'Organization') {
        return h(UBadge, { color: 'primary', variant: 'subtle' }, () => 'ORGANIZATION')
      } else if (row.original.metadata.target_type === 'User') {
        return h(UBadge, { color: 'secondary', variant: 'subtle' }, () => 'USER')
      }
    }
  },
  // { accessorKey: 'installation_id', header: 'Installation ID' },
  { 
    accessorKey: 'created_at', 
    header: 'Installed on',
    cell: ({ row }) => {
      return new Date(row.getValue('created_at')).toLocaleString('en-US', {
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
]

onMounted(async () => {
  if (user.value) {
    state.newDisplayName = user.value.user_metadata?.full_name || ''
    
    const { data, error } = await supabase
      .from('installations')
      .select('*')
      .eq('user_id', user.value.id) 
      .is('deleted_at', null)

    if (error) {
      console.error('Error fetching installations:', error)
      errorMessage.value = 'Failed to fetch installations.'
    } else {
      installations.value = data
    }
  }
})


async function updateProfile() {
  if (!isFormValid.value || !hasChanges.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: state.newDisplayName },
    });
    if (error) throw error;
    toast.add({
      title: 'Profile updated successfully!',
      color: 'success',
    });
  } catch (error: any) {
    errorMessage.value = error.message || 'An unknown error occurred.';
  } finally {
    loading.value = false;
  }
}
</script>