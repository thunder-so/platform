<template>
  <div>
    <Header />

    <div v-if="user">
      <h1>Welcome, {{ user.email }}</h1>
      <button @click="logout">Logout</button>

      <div v-if="loading">Loading memberships...</div>
      <div v-else-if="error">Error fetching memberships: {{ error.message }}</div>
      <ul v-else-if="memberships.length">
        <li v-for="membership in memberships" :key="membership.id">
          <div v-if="membership.pending">
            <nuxt-link :to="`/invite?organization_id=${membership.organizations.id}`">Invited to {{ membership.organizations.name }}</nuxt-link>
          </div>
          <div v-else>
            <nuxt-link :to="`/org/${membership.organizations.id}`">
              Organization: {{ membership.organizations.name }}
            </nuxt-link>
          </div>
        </li>
      </ul>
      <div v-else>No memberships found.</div>
    </div>

    <nuxt-link to="/org/new">New workspace</nuxt-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

// definePageMeta({
//   middleware: 'auth'
// })

const memberships = ref([])
const loading = ref(false)
const error = ref(null)

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error(error)
  } else {
    navigateTo('/login')
  }
}

onMounted(async () => {
  if (user.value) {
    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('memberships')
        .select(`
          id,
          pending,
          organizations:organization_id (id, name)
        `)
        .eq('user_id', user.value.id)

      if (fetchError) throw fetchError

      memberships.value = data
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }
})
</script>
