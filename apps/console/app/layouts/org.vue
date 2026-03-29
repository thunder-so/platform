<template>
  <div>
    <ClientOnly>
      <!-- Loading State -->
      <div v-if="isLoading" class="fixed inset-0 flex items-center justify-center bg-background">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div class="text-sm text-muted">Loading...</div>
        </div>
      </div>

      <!-- Access Denied -->
      <AccessDenied 
        v-else-if="accessStatus === 'no-access'" 
        message="You do not have access to this organization."
      >
        <UButton to="/" variant="outline">Go to Dashboard</UButton>
      </AccessDenied>

      <!-- Invite Screen -->
      <div v-else-if="accessStatus === 'invitee' && pendingInvite" class="fixed inset-0 flex items-center justify-center bg-background">
        <UCard class="max-w-md">
          <template #header>
            <h2>You're invited to join {{ pendingInvite.name }}</h2>
          </template>
          <p class="text-muted text-sm mb-4">Accept the invitation to join this workspace and start collaborating.</p>
          <UButton @click="acceptInvite" :loading="acceptingInvite" block>Accept Invitation</UButton>
        </UCard>
      </div>

      <!-- Main Dashboard Layout -->
      <UDashboardGroup v-else>
        <!-- Two-Column Sidebar -->
        <div class="hidden lg:flex flex-row h-screen">
          <LayoutOrganizationSidebar />

          <!-- Right Column: Navigation-->
          <UDashboardSidebar
            id="org-sidebar"
            class="w-82 border-r border-default"
            :ui="{ 
              header: 'border-b border-default',
              body: 'pt-4'
            }"
          >
            <template #header="{ collapsed }">
              <div v-if="!collapsed" class="flex justify-between w-full px-1">
                <span class="text-md font-bold text-highlighted truncate">
                  {{ selectedOrganization?.name }}
                </span>
                <div>
                  <UBadge v-if="selectedOrganization?.pending" size="md" color="secondary" variant="outline">Invited</UBadge>
                  <UBadge v-else-if="isPro" size="md" color="info" variant="outline">Pro</UBadge>
                  <UBadge v-else size="md" color="neutral" variant="outline">Free</UBadge>
                </div>
              </div>
            </template>

            <template #default="{ collapsed }">
              <UNavigationMenu
                v-if="selectedOrganization && !collapsed"
                :items="links"
                orientation="vertical"
                class="flex-1"
                :ui="{
                  link: 'p-3'
                }"
              />
            </template>

            <template #footer="{ collapsed }">
              <div v-if="!collapsed" class="w-full">
                <UCard variant="soft" class="mb-4">
                  <p class="text-sm text-muted mb-2">
                    Thunder is currently in beta.
                  </p>
                  <NuxtLink to="https://form.typeform.com/to/CSDLo4VO" target="_blank" rel="noopener noreferrer">
                    <UButton color="neutral" variant="soft" size="md" trailing-icon="tabler:external-link" block>
                      Send feedback
                    </UButton>
                  </NuxtLink>
                </UCard>
              </div>
            </template>
          </UDashboardSidebar>
        </div>

        <!-- Mobile Sidebar -->
        <UDashboardSidebar
          id="org-sidebar-mobile"
          mode="slideover"
          class="lg:hidden"
          :ui="{ header: 'border-b border-default' }"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UAvatar :alt="selectedOrganization?.name" size="sm" />
              <span class="flex-1 font-semibold truncate">{{ selectedOrganization?.name }}</span>
              <UBadge v-if="selectedOrganization?.pending" size="md" color="secondary" variant="outline">Invited</UBadge>
              <UBadge v-else-if="isPro" size="md" color="info" variant="outline">Pro</UBadge>
              <UBadge v-else size="md" color="neutral" variant="outline">Free</UBadge>
            </div>
          </template>

          <template #default>
            <LayoutMobileOrgSwitcher show-active-badge />

            <USeparator class="my-4" />

            <UNavigationMenu
              v-if="selectedOrganization"
              :items="links"
              orientation="vertical"
            />
          </template>

          <template #footer>
            <div class="flex flex-col w-full gap-4">
              <div class="flex items-center gap-2">
                <UAvatar :src="user?.user_metadata?.avatar_url" :alt="user?.user_metadata?.full_name" size="sm" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ user?.user_metadata?.full_name }}</p>
                  <p class="text-xs text-muted truncate">{{ user?.email }}</p>
                </div>
              </div>
              
              <div class="pt-4 border-t border-default">
                <ColorModeSwitcher />
              </div>
            </div>
          </template>
        </UDashboardSidebar>

        <!-- Main Panel -->
        <UDashboardPanel id="org-panel" class="flex-1">
          <template #header>
            <UDashboardNavbar :title="pageTitle">
              <template #leading>
                <UDashboardSidebarCollapse class="lg:hidden" />
              </template>

              <template #right>
                <LayoutNavbarActions />
              </template>
            </UDashboardNavbar>
          </template>

          <template #body>
            <UContainer>
              <slot />
            </UContainer>
          </template>
        </UDashboardPanel>
      </UDashboardGroup>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { any } from 'zod/v4-mini';

const route = useRoute();
const { setSelectedOrganization, selectedOrganization, hasAccessToOrg, getPendingInvite, refreshMemberships, isLoading, currentPlan } = useMemberships();
const { isFree, getPrimaryPrice } = usePolar();
const { $client } = useNuxtApp();
const toast = useToast();
const user = useSupabaseUser();

const isPro = computed(() => {
  const org = selectedOrganization.value;
  if (!org) return false;

  const activeSub = org.subscriptions
    ?.filter((sub: any) => sub.status !== 'canceled')
    ?.sort((a: any, b: any) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())
    ?.[0];
  
  const isProSub = !!activeSub && getPrimaryPrice(activeSub?.metadata as any)?.amount_type !== 'free';

  const recentOrder = org.orders
    ?.sort((a: any, b: any) => new Date(b.created_at || b.created || 0).getTime() - new Date(a.created_at || a.created || 0).getTime())
    ?.[0];

  const isProOrder = !!recentOrder && getPrimaryPrice(recentOrder?.metadata as any)?.amount_type !== 'free';

  return isProSub || isProOrder || false;
});

// Page title based on current route
const pageTitle = computed(() => {
  const path = route.path;
  if (path.includes('/aws')) return 'AWS Accounts';
  if (path.includes('/members')) return 'Members';
  if (path.includes('/billing')) return 'Billing';
  if (path.includes('/settings')) return 'Settings';
  return 'Projects';
});

// Navigation links
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

// Access control
const accessStatus = computed(() => {
  const orgId = route.params.org_id as string
  return orgId ? hasAccessToOrg(orgId) : 'member'
});

const pendingInvite = computed(() => {
  const orgId = route.params.org_id as string
  return orgId ? getPendingInvite(orgId) : null
});

const acceptingInvite = ref(false);

// Accept invitation
const acceptInvite = async () => {
  const orgId = route.params.org_id as string
  if (!orgId) return
  
  acceptingInvite.value = true
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
    acceptingInvite.value = false
  }
};

// Watch for org changes
watch(() => route.params.org_id, async (newOrgId, oldOrgId) => {
  if (newOrgId && newOrgId !== oldOrgId) {
    const success = setSelectedOrganization(newOrgId as string);
    if (!success) {
      console.error('Organization not found:', newOrgId);
    }
  }
});
</script>
