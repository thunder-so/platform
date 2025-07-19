<template>
  <div>
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Profile Page</h1>

      <div v-if="user">
        <p class="mb-2">Current Display Name: <span class="font-semibold">{{ displayName }}</span></p>

        <UForm :schema="schema" :state="state" @submit="updateProfile" class="space-y-4 max-w-sm">
          <UFormField label="New Display Name" name="newDisplayName">
            <UInput v-model="state.newDisplayName" placeholder="Enter new display name" />
          </UFormField>

          <UButton type="submit" :loading="loading">
            Update Profile
          </UButton>

          <p v-if="successMessage" class="text-green-500 text-xs italic mt-2">{{ successMessage }}</p>
          <p v-if="errorMessage" class="text-red-500 text-xs italic mt-2">{{ errorMessage }}</p>
        </UForm>
      </div>
      <div v-else>
        <p>Please log in to view your profile.</p>
      </div>

      <div class="mt-8">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold mb-4">Github accounts</h2>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { z } from 'zod'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { FormSubmitEvent } from '#ui/types'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const installations = ref<any[]>([])

definePageMeta({
  layout: 'org',
  middleware: ['github-middleware-client']
})

const githubApp = useRuntimeConfig().public.GITHUB_APP
const siteUrl = useRuntimeConfig().public.siteUrl
const base = useRequestURL().origin


const displayName = computed(() => user.value?.user_metadata?.full_name || 'N/A')

const schema = z.object({
  newDisplayName: z.string().min(3, 'Must be at least 3 characters'),
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
      // .eq('deleted_at', null)

    if (error) {
      console.error('Error fetching installations:', error)
      errorMessage.value = 'Failed to fetch installations.'
    } else {
      installations.value = data
    }
  }
})

const updateProfile = async (event: FormSubmitEvent<Schema>) => {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: event.data.newDisplayName },
    })

    if (error) {
      throw error
    }

    successMessage.value = 'Profile updated successfully!'
    // To reflect changes immediately, you might need to refresh the user data.
    // Consider calling a function to re-fetch the user state.
  } catch (error: any) {
    errorMessage.value = error.message || 'An unknown error occurred.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Add any specific styles here if needed */
</style>
