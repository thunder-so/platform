<template>
  <div>
    
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const { memberships, selectedOrganization, initializeSession } = useMemberships()

definePageMeta({
  layout: 'org'
});

onMounted(() => {
  if (selectedOrganization.value?.id) {
    navigateTo(`/org/${selectedOrganization.value.id}`)
  } else {
    initializeSession();
  }
})
</script>
