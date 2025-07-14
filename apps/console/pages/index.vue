<template>
  <div>
    <Header />

    <div v-if="user">
      <h1>Welcome, {{ user.email }}</h1>
      memberships: <pre>{{ memberships }}</pre>

      selectedOrganization: {{ selectedOrganization }}
    </div>
  </div>
</template>

<script setup>
const user = useSupabaseUser();
const { memberships, selectedOrganization, refreshMemberships } = useMemberships()
</script>
