<template>
  <div>
    <Header />

    <div v-if="selectedOrganization">
      <h1>{{ selectedOrganization.name }}</h1>
      <nav class="flex space-x-2 border-b border-gray-200 dark:border-gray-800 mb-4">
        <NuxtLink
          :to="`/org/${selectedOrganization.id}`"
          exact
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Applications
        </NuxtLink>
        <NuxtLink
          :to="`/org/${selectedOrganization.id}/aws`"
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          AWS Accounts
        </NuxtLink>
        <NuxtLink
          :to="`/org/${selectedOrganization.id}/members`"
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Members
        </NuxtLink>
        <NuxtLink
          :to="`/org/${selectedOrganization.id}/billing`"
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Billing
        </NuxtLink>
        <NuxtLink
          :to="`/org/${selectedOrganization.id}/settings`"
          class="px-3 py-2 font-medium text-sm rounded-t-lg text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
        >
          Settings
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
const route = useRoute();
const { setSelectedOrganization, selectedOrganization } = useMemberships();
console.log('layouts/org selectedOrganization', selectedOrganization.value)  

watch(() => route.params.org_id, (newOrgId) => {
  if (newOrgId) {
    setSelectedOrganization(newOrgId);
  }
}, { immediate: true });
</script>
