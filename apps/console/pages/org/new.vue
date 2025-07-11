<template>
  <div>
    <h1>Create New Organization</h1>
    <form @submit.prevent="createOrganization">
      <div>
        <label for="org-name">Organization Name</label>
        <input id="org-name" v-model="orgName" type="text" required />
      </div>

      <div v-if="loadingPlans">Loading plans...</div>
      <div v-else-if="errorPlans">Error fetching plans: {{ errorPlans.message }}</div>
      <fieldset v-else>
        <legend>Choose a plan:</legend>
        <div v-for="plan in plans" :key="plan.id">
          <input :id="`plan-${plan.id}`" v-model="selectedPlan" :value="Number(plan.id)" type="radio" name="plan" />
          <label :for="`plan-${plan.id}`">{{ plan.name }}</label>
        </div>
      </fieldset>

      <button type="submit" :disabled="loading">Create Organization</button>
      <div v-if="error" class="error">{{ error.message }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth'
})

const { $client } = useNuxtApp()

// const router = useRouter()
const supabase = useSupabaseClient()
// const user = useSupabaseUser()

const orgName = ref('')
const plans = ref([])
const selectedPlan = ref(null)
const loading = ref(false)
const loadingPlans = ref(false)
const error = ref(null)
const errorPlans = ref(null)

onMounted(async () => {
  loadingPlans.value = true
  try {
    const { data, error: fetchError } = await supabase.from('plans').select('*')
    if (fetchError) throw fetchError
    plans.value = data
  } catch (e) {
    errorPlans.value = e
  } finally {
    loadingPlans.value = false
  }
})

const createOrganization = async () => {
  if (!selectedPlan.value) {
    error.value = { message: 'Please select a plan' }
    return
  }

  loading.value = true
  error.value = null

  try {
    // $client.hello.query("Saddam")

    // console.log('Creating organization with:', {
    //   name: orgName.value,
    //   planId: selectedPlan.value
    // })

    const newOrg = await $client.organizationsRouter.create.mutate({
      name: orgName.value,
      planId: Number(selectedPlan.value),
    })

    // console.log('Organization created:', newOrg)

    // const chosenPlan = plans.value.find(p => p.id === selectedPlan.value)
    // if (chosenPlan && chosenPlan.price_id) {
    //   // Paid plan
    //   router.push('/coming-soon') // Placeholder for paid plan flow
    // } else {
    //   // Free plan
    //   router.push('/')
    // }

  } catch (e) {
    console.error('Error creating organization:', e)
    error.value = e
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.error {
  color: red;
}
</style>