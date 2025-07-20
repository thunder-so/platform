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

        <!-- {{ applicationSchema }} -->
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
const { applicationSchema, setSelectedApplication } = useApplications();

const primaryLinks = computed<NavigationMenuItem[]>(() => {
  if (!applicationSchema) return [];

  const orgId = applicationSchema.value?.organization_id;
  const appId = applicationSchema.value?.id;
  const envId = applicationSchema.value?.environments[0]?.id;
  const serviceType = applicationSchema.value?.environments[0]?.services[0]?.stack_type;

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
  if (!applicationSchema) return [];

  const orgId = applicationSchema.value?.organization_id;
  const appId = applicationSchema.value?.id;
  const envId = applicationSchema.value?.environments[0]?.id;
  const serviceType = applicationSchema.value?.environments[0]?.services[0]?.stack_type;

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

// console.log('layouts/app applicationSchema', applicationSchema.value)

watch(() => route.params.app_id, (newAppId) => {
  if (newAppId) {
    // console.log("layouts/app setSelectedApplication:", newAppId)
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