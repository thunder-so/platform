<template>
  <div>
    <!-- <Header /> -->
    
    <h3>Applications</h3>
    <div v-if="loading">Loading applications...</div>
    <div v-else-if="error">Error fetching applications: {{ error.message }}</div>
    <ul v-else-if="applications.length">
      <li v-for="app in applications" :key="app.id">
        {{ app.name }}
      </li>
    </ul>
    <div v-else>No applications found for this organization.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'org'
})

const route = useRoute()
const supabase = useSupabaseClient()

const applications = ref([])
const loading = ref(false)
const error = ref(null)

const orgId = route.params.slug

onMounted(async () => {
  loading.value = true
  try {
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select('id, name')
      .eq('organization_id', orgId)

    if (appError) throw appError
    applications.value = appData
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>
