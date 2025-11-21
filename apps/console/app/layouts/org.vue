<template>
  <div>
    <Header :mobile-menu-items="links" />
    <ClientOnly>
    <UMain>
      <div v-if="isLoading" class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div class="text-sm text-muted">Loading...</div>
        </div>
      </div>
      
      <AccessDenied 
        v-else-if="accessStatus === 'no-access'" 
        message="You do not have access to this organization."
      >
        <UButton to="/" variant="outline">Go to Dashboard</UButton>
      </AccessDenied>
      
      <div v-else-if="accessStatus === 'invitee' && pendingInvite" class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <UCard class="max-w-md">
          <template #header>
            <h2>You're invited to join {{ pendingInvite.name }}</h2>
          </template>
          <p class="text-muted text-sm mb-4">Accept the invitation to join this workspace and start collaborating.</p>
          <UButton @click="acceptInvite" :loading="loading" block>Accept Invitation</UButton>
        </UCard>
      </div>
      
      <div v-else class="grid grid-cols-6 gap-0 min-h-[calc(100vh-4rem)]">
        <div class="aside col-span-1 p-6 border-r border-muted lg:block hidden">
          <UNavigationMenu 
            v-if="selectedOrganization"
            :items="links"
            orientation="vertical" 
            :ui="{
              link: 'p-3 gap-2'
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
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute();
const router = useRouter();
const { setSelectedOrganization, selectedOrganization, hasAccessToOrg, getPendingInvite, refreshMemberships, isLoading } = useMemberships();
const { $client } = useNuxtApp();
const toast = useToast()

const links = computed<NavigationMenuItem[]>(() => {
  const orgId = selectedOrganization.value?.id;
  if (!orgId) return [];
  return [
    {
      label: 'Projects',
      to: `/org/${orgId}`,
      icon: 'tabler:apps'
    },
    {
      label: 'AWS Accounts',
      to: `/org/${orgId}/aws`,
      icon: 'tabler:brand-aws'
    },
    {
      label: 'Members',
      to: `/org/${orgId}/members`,
      icon: 'tabler:users'
    },
    {
      label: 'Billing',
      to: `/org/${orgId}/billing`,
      icon: 'tabler:credit-card'
    },
    {
      label: 'Settings',
      to: `/org/${orgId}/settings`,
      icon: 'tabler:settings'
    },
  ];
});

const accessStatus = computed(() => {
  const orgId = route.params.org_id as string
  return orgId ? hasAccessToOrg(orgId) : 'member'
})

const pendingInvite = computed(() => {
  const orgId = route.params.org_id as string
  return orgId ? getPendingInvite(orgId) : null
})

const loading = ref(false)

const acceptInvite = async () => {
  const orgId = route.params.org_id as string
  if (!orgId) return
  
  loading.value = true
  try {
    await $client.team.acceptInvite.mutate({ organizationId: orgId })
    await refreshMemberships()
    await reloadNuxtApp()
  } catch (error: any) {
    console.error('Failed to accept invitation:', error)
    toast.add({
      title: 'Failed to accept invitation',
      description: 'Please try again or contact support.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(() => route.params.org_id, async (newOrgId, oldOrgId) => {
  if (newOrgId && newOrgId !== oldOrgId) {
    const success = setSelectedOrganization(newOrgId as string);
    if (!success) {
      console.error('Organization not found:', newOrgId);
    }
  }
});
</script>