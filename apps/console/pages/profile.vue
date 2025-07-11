<template>
  <div>
    <Header />

    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Profile Page</h1>

      <div v-if="user">
        <p class="mb-2">Current Display Name: <span class="font-semibold">{{ displayName }}</span></p>

        <form @submit.prevent="updateProfile" class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="displayName">
              New Display Name:
            </label>
            <input
              id="displayName"
              v-model="newDisplayName"
              type="text"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter new display name"
            />
          </div>
          <div class="flex items-center justify-between">
            <button
              type="submit"
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              :disabled="loading"
            >
              {{ loading ? 'Updating...' : 'Update Profile' }}
            </button>
          </div>
          <p v-if="successMessage" class="text-green-500 text-xs italic mt-2">{{ successMessage }}</p>
          <p v-if="errorMessage" class="text-red-500 text-xs italic mt-2">{{ errorMessage }}</p>
        </form>
      </div>
      <div v-else>
        <p>Please log in to view your profile.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const newDisplayName = ref('')
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const displayName = computed(() => user.value?.user_metadata?.full_name || 'N/A')

onMounted(() => {
  if (user.value) {
    newDisplayName.value = user.value.user_metadata?.full_name || ''
  }
})

const updateProfile = async () => {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: newDisplayName.value },
    })

    if (error) {
      throw error
    }

    successMessage.value = 'Profile updated successfully!'
    // Refresh user data to reflect changes immediately
    // await user.value?.refresh()
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
