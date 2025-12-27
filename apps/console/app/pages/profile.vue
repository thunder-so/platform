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
        <div class="flex items-center justify-between">
          <h2>Github accounts</h2>
          <div>
            <UButton
              icon="tabler:plus"
              @click="handleInstallApp"
              :loading="installing"
            >
              Import repositories
            </UButton>
          </div>
        </div>
      </template>
      
      <UTable :columns="columns" :data="installations" />
    </UCard>

    <UCard class="mt-8">
      <template #header>
        <h3>Notification Preferences</h3>
      </template>
      
      <UCheckbox 
        v-model="emailNotificationsEnabled" 
        label="Enable Email Notifications"
        description="Toggle to receive or stop receiving email notifications."
      />
      
      <template #footer>
        <UButton 
          @click="savePreferences" 
          :loading="savingPreferences"
          :disabled="!hasPreferenceChanges">
          Save Preferences
        </UButton>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { z } from 'zod'
import type { DropdownMenuItem } from '@nuxt/ui'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const loading = ref(false)
const errorMessage = ref('')
const installations = ref<any[]>([])
const toast = useToast()
const emailNotificationsEnabled = ref(true)
const originalEmailNotificationsEnabled = ref(true)
const savingPreferences = ref(false)
const hasPreferenceChanges = computed(() => {
  return emailNotificationsEnabled.value !== originalEmailNotificationsEnabled.value
})
const installing = ref(false)
const { openInstallationPopup } = useGithubPopup()
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

definePageMeta({
  layout: 'org'
})

const displayName = computed(() => user.value?.user_metadata?.full_name || 'N/A')
const isFormValid = computed(() => state.newDisplayName && state.newDisplayName.length >= 3)
const hasChanges = computed(() => state.newDisplayName !== displayName.value)

const schema = z.object({
  newDisplayName: z.string()
    .min(3, 'Must be at least 3 characters')
    .regex(/^[a-zA-Z0-9 ]+$/, 'Only letters, numbers, and spaces are allowed'),
})


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
    id: 'action',
    cell: ({ row }) => h('div', { class: 'text-right' }, [
      h(resolveComponent('UDropdownMenu'), { items: getDropdownActions(row.original) }, () =>
        h(resolveComponent('UButton'), {
          icon: 'tabler:dots-vertical',
          color: 'neutral',
          variant: 'ghost',
          'aria-label': 'Actions'
        })
      )
    ])
  }
]


if (user.value) {
  state.newDisplayName = user.value.user_metadata?.full_name || ''
  await fetchInstallations()
  await loadEmailPreference()
}

async function fetchInstallations() {
  if (!user.value) return
  const { data, error } = await supabase
    .from('installations')
    .select('*')
    .eq('user_id', user.value.sub)
    .is('deleted_at', null)
  if (error) {
    console.error('Error fetching installations:', error)
    errorMessage.value = 'Failed to fetch installations.'
  } else {
    installations.value = data
  }
}

async function handleInstallApp() {
  installing.value = true
  try {
    await openInstallationPopup()
    await fetchInstallations()
    toast.add({
      title: 'GitHub App installed successfully',
      color: 'success'
    })
  } catch (error: any) {
    if (error.message !== 'Installation cancelled') {
      toast.add({
        title: 'Installation failed',
        description: error.message,
        color: 'error'
      })
    }
  } finally {
    installing.value = false
  }
}

async function loadEmailPreference() {
  if (!user.value) return
  const { data } = await supabase
    .from('users')
    .select('email_enabled')
    .eq('id', user.value.sub)
    .single()
  emailNotificationsEnabled.value = data?.email_enabled ?? true
  originalEmailNotificationsEnabled.value = emailNotificationsEnabled.value
}

async function savePreferences() {
  if (!user.value) return
  savingPreferences.value = true
  try {
    await supabase
      .from('users')
      .update({
        email_enabled: emailNotificationsEnabled.value
      })
      .eq('id', user.value.sub)
    originalEmailNotificationsEnabled.value = emailNotificationsEnabled.value
    toast.add({
      title: 'Preferences saved successfully',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Failed to save preferences',
      color: 'error'
    })
  } finally {
    savingPreferences.value = false
  }
}

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