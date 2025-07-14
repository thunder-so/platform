<template>
  <div>
    <Header />

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const displayName = computed(() => user.value?.user_metadata?.full_name || 'N/A')

const schema = z.object({
  newDisplayName: z.string().min(3, 'Must be at least 3 characters'),
})

type Schema = z.output<typeof schema>

const state = reactive({
  newDisplayName: ''
})

onMounted(() => {
  if (user.value) {
    state.newDisplayName = user.value.user_metadata?.full_name || ''
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
