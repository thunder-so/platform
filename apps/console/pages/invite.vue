<template>
  <div class="min-h-screen flex flex-col items-center justify-center">
    <div v-if="pending">Loading invitation...</div>

    <div v-else-if="pendingInvite">
      <div class="bg-gray-100 p-6 rounded-lg shadow-md mb-4">
        <h1 class="text-2xl font-bold mb-2">You've been invited to join {{ pendingInvite?.organization?.name }}</h1>
        <p class="mb-4">Accept the invitation to join the organization.</p>
        <UButton @click="accept(pendingInvite?.organization?.id)" :loading="loading">Accept Invitation</UButton>
      </div>
    </div>
    <div v-else-if="inviteError">
      <h1 class="text-2xl font-bold">Error processing invitation</h1>
      <p>There appears to be a glitch.</p>
      <NuxtLink to="/">Go back to dashboard</NuxtLink>
    </div>
    <div v-else>
      <h1 class="text-2xl font-bold">No invitation found</h1>
      <p>There appears to be a glitch.</p>
      <NuxtLink to="/">Go back to dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// import type { memberships, organizations } from '~/server/db/schema'

const { $client } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const organizationId = route.query.organization_id as string

// Fetch invitation
const { data: pendingInvite, pending, error: inviteError } = useAsyncData(
  'pendingInvite',
  async () => {
    return $client.team.getPendingInvite.query({ organizationId })
  },
  {
    lazy: true,
    server: false,
    watch: [user]
  }
)

// Accept invitation
const loading = ref(false)

async function accept(organizationId: string | undefined) {
  loading.value = true
  try {
    const { id } = await $client.team.acceptInvite.mutate({ organizationId: organizationId as string })
    router.push(`/org/${id}`)
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    // Handle error appropriately
  } finally {
    loading.value = false
  }
}

</script>