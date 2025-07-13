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
})

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
