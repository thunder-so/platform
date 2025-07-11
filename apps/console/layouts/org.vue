<template>
  <div>
    <Header />

    <div v-if="loading">Loading organization...</div>
    <div v-else-if="error">Error loading organization: {{ error.message }}</div>
    <div v-else-if="organization">
      <h1>{{ organization.name }}</h1>
      <nav class="flex space-x-2 border-b border-gray-200 dark:border-gray-800 mb-4">
        <NuxtLink
          :to="`/org/${orgId}`"
          exact
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Applications
        </NuxtLink>
        <NuxtLink
          :to="`/org/${orgId}/settings`"
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Settings
        </NuxtLink>
        <NuxtLink
          :to="`/org/${orgId}/members`"
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Members
        </NuxtLink>
      </nav>
      <div class="py-4">
        <slot />
      </div>
    </div>
    <div v-else>
        Organization not found.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
const route = useRoute()
const supabase = useSupabaseClient()

const organization = ref(null)
const loading = ref(false)
const error = ref(null)

const orgId = route.params.slug

// provide organization data to child pages
provide('organization', organization)

onMounted(async () => {
  loading.value = true
  try {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (orgError) throw orgError
    organization.value = orgData
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>
