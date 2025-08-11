<template>
  <div>
    <div v-if="pending">Loading invitation...</div>

    <div v-else-if="pendingInvite">
      <UCard>
        <template #header>
          <h1 class="text-2xl font-bold">You've been invited to join {{ pendingInvite?.organization?.name }}</h1>
        </template>
        
        <p class="mb-4">Accept the invitation to join the organization.</p>
        <UButton @click="accept(pendingInvite?.organization?.id)" :loading="loading">Accept Invitation</UButton>
      </UCard>
    </div>
    <div v-else="inviteError">
      <UAlert color="error" variant="soft" title="Error processing invitation" description="Your invitation has either expired or has been revoked. Please contact the product owner." />
      <p>
        <UButton to="/login" class="mt-4">Go to Login</UButton>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'blank',
});

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