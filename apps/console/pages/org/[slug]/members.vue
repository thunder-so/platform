<template>
  <div>
    <div class="mb-4">
      <h3 class="text-lg font-medium">Invite Member</h3>
      <form @submit.prevent="inviteMember" class="flex items-center space-x-2 mt-2">
        <UInput v-model="emailToInvite" placeholder="member@example.com" class="flex-grow" />
        <UButton type="submit" :loading="inviting">Invite</UButton>
      </form>
      <p v-if="inviteError" class="text-red-500 mt-2">{{ inviteError.message }}</p>
    </div>

    <div v-if="isLoading">Loading members...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <h3 class="text-lg font-medium mb-2">Active Members</h3>
      <ul v-if="members.filter(m => !m.pending).length" class="space-y-2">
        <li v-for="member in members.filter(m => !m.pending)" :key="member.id" class="flex items-center justify-between p-2 border rounded-md">
          <div>
            <p class="font-semibold">{{ member.user.fullName || member.user.email }}</p>
            <p class="text-sm text-gray-500">{{ member.access }}</p>
          </div>
          <UButton color="red" variant="soft" @click="removeMember(member.id)" :loading="removingMemberId === member.id">Remove</UButton>
        </li>
      </ul>
      <div v-else class="text-gray-500">No active members.</div>

      <h3 class="text-lg font-medium mt-6 mb-2">Pending Invitations</h3>
      <ul v-if="members.filter(m => m.pending).length" class="space-y-2">
        <li v-for="member in members.filter(m => m.pending)" :key="member.id" class="flex items-center justify-between p-2 border rounded-md">
          <div>
            <p class="font-semibold">{{ member.user.email }}</p>
            <p class="text-sm text-gray-500">{{ member.access }} (Pending)</p>
          </div>
          <UButton color="red" variant="soft" @click="removeMember(member.id)" :loading="removingMemberId === member.id">Cancel Invite</UButton>
        </li>
      </ul>
      <div v-else class="text-gray-500">No pending invitations.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const route = useRoute()
const supabase = useSupabaseClient()
const { $client } = useNuxtApp()

definePageMeta({
  layout: 'org',
  // middleware: 'auth' 
})

const orgId = route.params.slug
const emailToInvite = ref('')
const inviting = ref(false)
const inviteError = ref(null)
const removingMemberId = ref(null)

const members = ref([])
const isLoading = ref(false)
const error = ref(null)

const fetchMembers = async () => {
  isLoading.value = true
  error.value = null
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

    if (fetchError) throw fetchError
    members.value = data
  } catch (e) {
    error.value = e
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchMembers()
})

const inviteMember = async () => {
  inviting.value = true
  inviteError.value = null
  try {
    await $client.team.inviteMember.mutate({ organizationId: orgId, email: emailToInvite.value })
    emailToInvite.value = ''
    await fetchMembers()
  } catch (e) {
    inviteError.value = e
  } finally {
    inviting.value = false
  }
}

const removeMember = async (membershipId) => {
  removingMemberId.value = membershipId;
  try {
    await $client.team.removeMember.mutate({ membershipId })
    await fetchMembers()
  } catch (e) {
    console.error('Failed to remove member:', e)
    alert('Failed to remove member. See console for details.')
  } finally {
    removingMemberId.value = null;
  }
}
</script>
