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
      <AccessDenied v-else-if="!hasAccess" message="You do not have access to this application or it no longer exists.">
        <UButton to="/" variant="outline">Go to Dashboard</UButton>
      </AccessDenied>

      <!-- Main Dashboard Layout -->
      <UDashboardGroup v-else>
        <!-- Two-Column Sidebar -->
        <div class="hidden lg:flex flex-row h-screen">
          <LayoutOrganizationSidebar />

          <!-- Right Column: App Navigation -->
          <UDashboardSidebar
            id="app-sidebar"
            class="w-82 border-r border-default"
            :ui="{ 
              header: 'border-b border-default',
              body: 'pt-4'
            }"
          >
            <template #header="{ collapsed }">
              <div v-if="!collapsed" class="flex items-center gap-2 px-1">
                <span class="flex-1 text-md font-bold text-highlighted truncate">
                  {{ applicationSchema?.display_name }}
                </span>
              </div>
            </template>

            <template #default="{ collapsed }">
              <UNavigationMenu
                v-if="applicationSchema && !collapsed"
                :items="navigationItems"
                orientation="vertical"
                class="flex-1"
                :ui="{ link: 'p-3' }"
              />
            </template>

            <template #footer="{ collapsed }">
            </template>
          </UDashboardSidebar>
        </div>

        <!-- Mobile Sidebar -->
        <UDashboardSidebar
          id="app-sidebar-mobile"
          mode="slideover"
          class="lg:hidden"
        >
          <template #header>
            <div class="flex flex-col gap-1">
              <!-- Breadcrumb -->
              <div class="flex items-center gap-2 text-sm text-muted">
                <NuxtLink :to="`/org/${applicationSchema?.organization_id}`">
                  {{ selectedOrganization?.name }}
                </NuxtLink>
                <Icon name="tabler:chevron-right" class="w-3 h-3" />
                <NuxtLink :to="`/app/${appId}`">
                  {{ applicationSchema?.display_name }}
                </NuxtLink>
                <Icon name="tabler:chevron-right" class="w-3 h-3" />
                <span class="text-highlighted">{{ pageTitle }}</span>
              </div>
            </div>
          </template>

          <template #default>
            <LayoutMobileOrgSwitcher />

            <USeparator class="my-4" />

            <!-- Navigation -->
            <UNavigationMenu
              v-if="applicationSchema"
              :items="navigationItems"
              orientation="vertical"
            />
          </template>

          <template #footer>
            <div class="flex flex-col w-full gap-4">
              <UButton
                :to="`/org/${applicationSchema?.organization_id}`"
                color="neutral"
                variant="ghost"
                size="sm"
                leading-icon="tabler:arrow-left"
                block
              >
                Back to Org
              </UButton>
              <div class="pt-4 border-t border-default">
                <ColorModeSwitcher />
              </div>
            </div>
          </template>
        </UDashboardSidebar>

        <!-- Main Panel -->
        <UDashboardPanel id="app-panel">
          <template #header>
            <UDashboardNavbar>
              <template #leading>
                <UDashboardSidebarCollapse class="lg:hidden" />
              </template>

              <template #title>
                <div class="flex flex-col">
                  <!-- Breadcrumb: org > app > page -->
                  <div class="flex items-center gap-2 text-sm text-muted">
                    <NuxtLink :to="`/org/${applicationSchema?.organization_id}`" class="hover:text-primary transition-colors">
                      {{ selectedOrganization?.name }}
                    </NuxtLink>
                    <Icon name="tabler:chevron-right" class="w-3 h-3" />
                    <NuxtLink :to="`/app/${appId}`" class="hover:text-primary transition-colors">
                      {{ applicationSchema?.display_name }}
                    </NuxtLink>
                    <Icon name="tabler:chevron-right" class="w-3 h-3" />
                    <span class="text-highlighted">{{ pageTitle }}</span>
                  </div>
                </div>
              </template>

              <template #right>
                <LayoutNavbarActions />
              </template>
            </UDashboardNavbar>
          </template>

          <template #body>
              <div class="w-full border-b border-default pb-4">
                <UContainer>
                  <div class="flex justify-between">
                    <div>
                      <div class="flex items-center gap-4 mb-4">
                        <h1 class="text-xl tracking-tight text-highlighted">{{ applicationSchema?.display_name }}</h1>
                        <UBadge v-if="service?.stack_type === 'STATIC'" color="secondary" variant="subtle">STATIC</UBadge>
                        <UBadge v-if="service?.stack_type === 'LAMBDA'" color="success" variant="subtle">LAMBDA</UBadge>
                        <UBadge v-if="service?.stack_type === 'FARGATE'" color="info" variant="subtle">FARGATE</UBadge>
                      </div>
                      <div class="flex items-center gap-6">
                        <div class="flex items-center gap-2">
                          <NuxtLink 
                            :to="`https://github.com/${service?.pipeline_metadata?.sourceProps?.owner}/${service?.pipeline_metadata?.sourceProps?.repo}`" 
                            target="_blank" 
                            class="text-muted hover:text-highlighted transition-colors"
                          >
                            <span class="flex items-center justify-center gap-1">
                              <Icon name="tabler:brand-github" class="w-4 h-4 mt-1" />
                              <span class="text-sm">{{service?.pipeline_metadata?.sourceProps?.owner}} / {{service?.pipeline_metadata?.sourceProps?.repo}}</span>
                            </span>
                          </NuxtLink>
                          <NuxtLink 
                            :to="`https://github.com/${service?.pipeline_metadata?.sourceProps?.owner}/${service?.pipeline_metadata?.sourceProps?.repo}/tree/${service?.pipeline_metadata?.sourceProps?.branchOrRef}`" 
                            target="_blank" 
                            class="text-muted hover:text-highlighted transition-colors"
                          >
                            <span class="flex items-center justify-center gap-1">
                              <Icon name="tabler:git-branch" class="w-4 h-4 mt-1" />
                              <span class="text-sm">{{service?.pipeline_metadata?.sourceProps?.branchOrRef}}</span>
                            </span>
                          </NuxtLink>
                        </div>
                        <div class="flex items-center justify-center gap-2">
                          <Icon name="tabler:brand-aws" class="h-5 w-5 mt-1 text-muted" />
                          <span class="text-sm text-muted">{{ provider?.alias }} / {{ environment?.region }}</span>
                        </div>
                      </div>
                      <div class="mt-2 text-left">
                        <NuxtLink 
                          v-if="serviceUrl" 
                          :to="serviceUrl" 
                          target="_blank" 
                          class="inline-block text-sm text-muted hover:text-highlighted transition-colors"
                        >
                          <span class="flex items-center gap-1">
                            <Icon name="tabler:link" class="w-4 h-4 mt-1 text-muted" />
                            <span>{{serviceUrl}}</span>
                          </span>
                        </NuxtLink>
                        <span v-else class="inline-block text-sm text-muted">
                          <span class="flex items-center gap-1">
                            <Icon name="tabler:link" class="w-4 h-4 mt-1 text-muted" />
                            <span>-</span>
                          </span>
                        </span>
                      </div>
                    </div>
                    <div class="flex justify-center items-center">
                      <div v-if="service?.resources">
                        <UPopover
                          v-model:open="isDeployPopoverOpen"
                          mode="click"
                          :content="{
                            align: 'end',
                            side: 'bottom',
                          }"
                        >
                          <UButton 
                            label="Deploy" 
                            size="lg" 
                            color="neutral" 
                            variant="outline" 
                            trailing-icon="tabler:chevron-down"
                          />

                          <template #content>
                            <div class="p-2">
                              <ul class="space-y-1">
                                <li>
                                  <UButton class="w-full" variant="ghost" label="Deploy latest commit" @click="() => { openDeployLatestModal(); isDeployPopoverOpen = false }" />
                                </li>
                                <li>
                                  <UButton class="w-full" variant="ghost" label="Deploy specific commit" @click="() => { openDeployCommitModal(); isDeployPopoverOpen = false }" />
                                </li>
                              </ul>
                            </div>
                          </template>
                        </UPopover>
                      </div>
                    </div>
                  </div>
                </UContainer>
              </div>

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
import { watch, computed, onUnmounted } from 'vue';
import type { NavigationMenuItem } from '@nuxt/ui'
import { useApplications } from '~/composables/useApplications';
import { AppDeployCommitModal, AppDeployLatestModal } from '#components';

const route = useRoute();
const { $client } = useNuxtApp();
const { 
  applicationSchema, 
  setApplicationSchemaById, 
  currentEnvironment: environment, 
  currentService, 
  clearApplicationSchema, 
  hasAccessToApp, 
  isLoading, 
  refreshApplicationSchema 
} = useApplications();
const { selectedOrganization, memberships } = useMemberships();
const supabase = useSupabaseClient();

const provider = computed(() => environment.value?.provider);
const service = computed(() => currentService.value);
const serviceUrl = computed(() => {
  const resources = service.value?.resources;
  return resources?.CloudFrontDistributionUrl || resources?.ApiGatewayUrl || (resources?.LoadBalancerDNS ? `http://${resources.LoadBalancerDNS}` : null);
});
const toast = useToast();
const overlay = useOverlay();
const isDeployPopoverOpen = ref(false);

// Use the route param for navigation immediately when present (falls back to loaded schema id).
const appId = computed(() => {
  const param = route.params.app_id as string | undefined;
  return param ?? applicationSchema.value?.id;
});
const serviceType = computed(() => service.value?.stack_type);

// Page title based on current route
const pageTitle = computed(() => {
  const path = route.path;
  if (route.params.build_id) return `Build: ${(route.params.build_id as string).substring(0, 8)}`;
  if (route.params.deploy_id) return `Deploy: ${(route.params.deploy_id as string).substring(0, 8)}`;
  if (path.endsWith('/settings')) return 'Settings';
  if (path.endsWith('/logs')) return 'Logs';
  if (path.endsWith('/variables')) return 'Environment Variables';
  if (path.endsWith('/domains')) return 'Domains';
  if (path.endsWith('/headers')) return 'Headers';
  if (path.endsWith('/redirects')) return 'Redirects';
  return 'Events';
});

// Combined navigation items with groups
const navigationItems = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [];
  
  // Primary links
  items.push(
    {
      label: 'Events',
      to: `/app/${appId.value}`,
      icon: 'tabler:activity'
    },
    {
      label: 'Settings',
      to: `/app/${appId.value}/settings`,
      icon: 'tabler:settings'
    }
  );

  // Only add Runtime Logs for LAMBDA and FARGATE stack types
  if (serviceType.value === 'LAMBDA' || serviceType.value === 'FARGATE') {
    items.push({
      label: 'Logs',
      to: `/app/${appId.value}/logs`,
      icon: 'tabler:file-text'
    });
  }

  // Management links
  items.push(
    {
      label: 'Environment Variables',
      to: `/app/${appId.value}/variables`,
      icon: 'tabler:variable'
    },
    {
      label: 'Domains',
      to: `/app/${appId.value}/domains`,
      icon: 'tabler:world'
    }
  );
  
  // Only add Headers and Redirects for STATIC stack type
  if (serviceType.value === 'STATIC') {
    items.push(
      {
        label: 'Headers',
        to: `/app/${appId.value}/headers`,
        icon: 'tabler:brackets-angle'
      },
      {
        label: 'Redirects',
        to: `/app/${appId.value}/redirects`,
        icon: 'tabler:arrows-shuffle'
      }
    );
  }
  
  return items;
});

async function openDeployCommitModal() {
  const deployCommitModal = overlay.create(AppDeployCommitModal, {
    props: {
      service: service.value as any,
      environment: environment.value as any
    }
  });

  const sha = await deployCommitModal.open().result;
  if (sha) {
    await deployCommit(sha);
  }
}

async function openDeployLatestModal() {
  const deployLatestModal = overlay.create(AppDeployLatestModal, {
    props: {
      service: service.value as any,
      environment: environment.value as any
    }
  });

  const sha = await deployLatestModal.open().result;
  // DeployLatestModal triggers the pipeline itself and shows feedback; no further action required here.
}

async function deployCommit(sha?: string) {    
  try {
    await $client.services.triggerPipeline.mutate({
      providerId: provider.value!.id,
      serviceId: service.value!.id,
      sha: sha,
    });
    const message = sha ? `Deployment started for commit ${sha.substring(0,7)}` : 'Deployment started for latest commit';
    toast.add({ title: 'Success', description: message });
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message || 'Failed to start deployment.', color: 'error' });
  }
}

const hasAccess = computed(() => {
  const appId = route.params.app_id as string
  return appId ? hasAccessToApp(appId) : true
});

watch(() => route.params.app_id, async (newAppId) => {
  if (newAppId) {
    await setApplicationSchemaById(newAppId as string)
  }
}, { immediate: true });

// Subscribe to service updates to refresh when resources change
let serviceChannel: any = null;
watch(currentService, (service) => {
  if (serviceChannel) supabase.removeChannel(serviceChannel);
  
  if (service?.id) {
    serviceChannel = supabase
      .channel(`service:${service.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'services', 
        filter: `id=eq.${service.id}` 
      }, async () => {
        await refreshApplicationSchema();
      })
      .subscribe();
  }
}, { immediate: true });

onUnmounted(() => {
  if (serviceChannel) supabase.removeChannel(serviceChannel);
  clearApplicationSchema();
});
</script>
