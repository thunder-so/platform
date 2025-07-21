<template>
  <div>
    <Header />

    <UContainer>
      <main class="mt-12 mb-12"> 
        <slot />
      </main>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
// const route = useRoute();
// const { setSelectedOrganization, selectedOrganization } = useMemberships();
</script>