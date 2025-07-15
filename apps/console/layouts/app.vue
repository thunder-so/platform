<template>
  <div>
    <Header />

    <div class="app-container">
      <aside class="sidebar bg-elevated border-r border-muted">
        <UNavigationMenu 
          v-if="selectedApplication"
          :items="links"
          orientation="vertical" 
          class="mb-4"
        />
      </aside>
      <main class="main-content"> 
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useApplications } from '~/composables/useApplications';
import Header from '~/components/Header.vue';

const route = useRoute();
const { selectedApplication, setSelectedApplication } = useApplications();

const links = computed<NavigationMenuItem[]>(() => {
  const appId = selectedApplication.value?.id;
  if (!appId) return [];
  return [
    {
      label: 'Overview',
      to: `/app/${appId}`,
    },
    {
      label: 'Environments',
      to: `/app/${appId}/environments`,
    },
    {
      label: 'Settings',
      to: `/app/${appId}/settings`,
    },
  ];
});

watch(() => route.params.app_id, (newAppId) => {
  if (newAppId) {
    setSelectedApplication(newAppId as string);
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
  padding: 30px 60px;
}
</style>