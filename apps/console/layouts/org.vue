<template>
  <div>
    <Header />

    <div class="app-container">
      <aside class="sidebar bg-elevated border-r border-muted">
        <UNavigationMenu 
          v-if="selectedOrganization"
          :items="links"
          orientation="vertical" 
          class="mb-4"
        />
      </aside>
      <main class="main-content"> 
        <UContainer>
          <slot />
        </UContainer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute();
const { setSelectedOrganization, selectedOrganization } = useMemberships();

const links = computed<NavigationMenuItem[]>(() => {
  const orgId = selectedOrganization.value?.id;
  if (!orgId) return [];
  return [
    {
      label: 'Applications',
      to: `/org/${orgId}`,
    },
    {
      label: 'AWS Accounts',
      to: `/org/${orgId}/aws`,
    },
    {
      label: 'Members',
      to: `/org/${orgId}/members`,
    },
    {
      label: 'Billing',
      to: `/org/${orgId}/billing`,
    },
    {
      label: 'Settings',
      to: `/org/${orgId}/settings`,
    },
  ];
});

watch(() => route.params.org_id, (newOrgId) => {
  if (newOrgId) {
    const found = setSelectedOrganization(newOrgId as string);
    if (!found) {
      navigateTo('/404');
    }
  }
}, { immediate: true });
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  color: #fff;
}

.sidebar {
  width: 303px;
  padding: 20px;
}
.main-content {
  flex-grow: 1;
  padding: 30px 0;
}
</style>