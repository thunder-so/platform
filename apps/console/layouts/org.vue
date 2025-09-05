<template>
  <div>
    <Header />

    <UDashboardGroup storage-key="org-dashboard" class="mt-14">
      <UDashboardSidebar collapsible class="border-muted">
        <UNavigationMenu 
          v-if="selectedOrganization"
          :items="links"
          orientation="vertical" 
          :ui="{
            link: 'p-3'
          }"
          class="mt-4"
        />
      </UDashboardSidebar>

      <UDashboardPanel>
        <template #body>
          <UContainer>
            <slot />
          </UContainer>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
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