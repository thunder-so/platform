<template>
  <div>
    <!-- <Header /> -->

    <h3>Settings</h3>
    <form @submit.prevent="updateOrganization" class="space-y-4 max-w-sm">
      <UFormField label="Display Name" name="displayName">
        <UInput v-model="displayName" />
      </UFormField>

      <UButton type="submit" :loading="loading">
        Save
      </UButton>
      <p v-if="success" class="text-green-500">Settings saved!</p>
    </form>

    <h3 class="mt-8">Danger Zone</h3>
    <div class="border border-red-500 p-4 rounded-md">
      <p class="text-red-500 mb-4">
        Deleting your organization is a permanent action and cannot be undone.
      </p>
      <div v-if="hasApplications" class="text-red-500">
        <p>You cannot delete this organization because it still has applications associated with it.</p>
        <p>Please delete all applications before attempting to delete the organization.</p>
      </div>
      <UButton v-else color="red" @click="confirmDelete = true">
        Delete Organization
      </UButton>

      <UModal v-model="confirmDelete">
        <div class="p-4">
          <h3 class="text-lg font-bold mb-4">Confirm Deletion</h3>
          <p class="mb-4">Are you sure you want to delete "{{ displayName }}"?</p>
          <p class="mb-4 text-red-500">This action cannot be undone.</p>
          <div class="flex justify-end space-x-2">
            <UButton color="gray" @click="confirmDelete = false">Cancel</UButton>
            <UButton color="red" @click="deleteOrganization" :loading="deleting">Delete</UButton>
          </div>
        </div>
      </UModal>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'

definePageMeta({
  layout: 'org'
})

const route = useRoute()
const supabase = useSupabaseClient()

const loading = ref(false)
const error = ref(null)
const success = ref(false)
const displayName = ref('')
const hasApplications = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)

const organization = inject('organization');
const orgId = route.params.slug

onMounted(async () => {
  const { data, error: fetchError } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  if (fetchError) {
    error.value = fetchError
  } else if (data) {
    displayName.value = data.name || ''
  }
  await checkApplications()
})

const checkApplications = async () => {
  try {
    const { count, error: fetchError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    if (fetchError) throw fetchError
    hasApplications.value = count > 0
  } catch (e) {
    console.error("Error checking applications:", e.message)
    // Optionally, handle error display to the user
  }
}

const deleteOrganization = async () => {
  deleting.value = true
  try {
    const { $client } = useNuxtApp()
    await $client.organizations.delete.mutate({ orgId })
    confirmDelete.value = false
    // Redirect to home page after successful deletion
    await navigateTo('/')
  } catch (e) {
    console.error("Error deleting organization:", e)
    // Optionally, display error to the user
    alert("Failed to delete organization: " + e.message)
  } finally {
    deleting.value = false
  }
}

const updateOrganization = async () => {
  loading.value = true
  success.value = false
  error.value = null
  try {
    const { data, error: updateError } = await supabase
      .from('organizations')
      .update({ name: displayName.value })
      .eq('id', orgId)
      .select('name')
      .single()

    if (data && organization) {
      organization.value.name = data.name;
    }

    if (updateError) throw updateError
    success.value = true
    // hide success message after 3 seconds
    setTimeout(() => success.value = false, 3000)
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}
</script>
