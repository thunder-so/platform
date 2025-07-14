<template>
  <div>
    <div v-if="user">
      <h1>Welcome, {{ user.email }}</h1>
      memberships: {{ memberships.length }}
      selectedOrganization: {{ selectedOrganization }}
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const { memberships, selectedOrganization, refreshMemberships } = useMemberships()

definePageMeta({
  layout: 'org'
});
</script>
