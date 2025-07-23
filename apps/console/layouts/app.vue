<template>
  <div>
    <Header />

    <div class="app-container">
      <aside class="sidebar bg-elevated border-r border-muted">
        <div class="pb-2 border-b border-muted mb-4">
          <NuxtLink :to="`/org/${applicationSchema?.organization_id}`" class="text-sm button flex items-center gap-1">
            <UIcon name="i-lucide-arrow-left" />
            Dashboard
          </NuxtLink>

          <h2 class="pt-2 text-xl font-medium">{{ applicationSchema?.name }}</h2>
        </div>

        <UNavigationMenu 
          v-if="applicationSchema"
          :items="primaryLinks"
          orientation="vertical" 
          class="mb-4"
        />

        <h3>Manage</h3>
        <UNavigationMenu 
          v-if="applicationSchema"
          :items="manageLinks"
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

const { applicationSchema } = useApplications();

if (!applicationSchema.value) {
  throw Error('Application schema not found.')
}
const environment = applicationSchema.value?.environments?.[0];
const service = environment?.services?.[0];
const appId = applicationSchema.value?.id;
const envId = environment?.id;
const serviceType = service?.stack_type;

const primaryLinks = computed<NavigationMenuItem[]>(() => {
  return [
    {
      label: 'Deployments',
      to: `/app/${appId}`,
    },
    {
      label: 'Settings',
      to: `/app/${appId}/env/${envId}/settings`,
    },
  ];
});

const manageLinks = computed<NavigationMenuItem[]>(() => {
  const links = [
    {
      label: 'Environment',
      to: `/app/${appId}/env/${envId}/variables`,
    },
    {
      label: 'Domains',
      to: `/app/${appId}/env/${envId}/domains`,
    }
  ];
  
  // Only add Headers and Redirects for SPA stack type
  if (serviceType === 'SPA') {
    links.push(
      {
        label: 'Headers',
        to: `/app/${appId}/env/${envId}/headers`,
      },
      {
        label: 'Redirects',
        to: `/app/${appId}/env/${envId}/redirects`,
      }
    );
  }
  
  return links;
});
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