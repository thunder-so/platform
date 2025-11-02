<template>
  <div>
    <Header :mobile-menu-items="links" />
    <UMain>
      <AccessDenied 
        v-if="!hasAccess" 
        message="You do not have access to this organization."
      >
        <UButton to="/" variant="outline">Go to Dashboard</UButton>
      </AccessDenied>
      <div v-else class="grid grid-cols-6 gap-0 min-h-[calc(100vh-4rem)]">
        <div class="aside col-span-1 p-6 border-r border-muted lg:block hidden">
          <UNavigationMenu 
            v-if="selectedOrganization"
            :items="links"
            orientation="vertical" 
            :ui="{
              link: 'p-3'
            }"
          />
        </div>
        <div class="p-6 lg:col-span-5 col-span-6">
          <UContainer>
            <slot />
          </UContainer>
        </div>
      </div>
    </UMain>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute();
const { setSelectedOrganization, selectedOrganization, hasAccessToOrg } = useMemberships();

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

const hasAccess = computed(() => {
  const orgId = route.params.org_id as string
  return orgId ? hasAccessToOrg(orgId) : true
})

watch(() => route.params.org_id, (newOrgId) => {
  if (newOrgId) {
    setSelectedOrganization(newOrgId as string)
  }
}, { immediate: true });
</script>