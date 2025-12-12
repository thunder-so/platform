<template>
  <div>
    <Header :mobile-menu-items="[...primaryLinks, ...manageLinks]" />
    <ClientOnly>
    <UMain>
      <div v-if="isLoading" class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div class="text-sm text-muted">Loading...</div>
        </div>
      </div>

      <AccessDenied v-else-if="!hasAccess" message="You do not have access to this application or it no longer exists.">
        <UButton to="/" variant="outline">Go to Dashboard</UButton>
      </AccessDenied>

      <div v-else class="grid grid-cols-6 gap-0 min-h-[calc(100vh-4rem)]">
        <div class="col-span-1 p-6 border-r border-muted lg:block hidden">
          <div v-if="applicationSchema">
            <!-- <div class="pb-2">
              <UButton :to="`/org/${applicationSchema?.organization_id}`" variant="ghost" size="sm" leading-icon="tabler:arrow-left">
                Dashboard
              </UButton>
            </div> -->

            <UNavigationMenu 
              :items="primaryLinks"
              orientation="vertical" 
              :ui="{
                link: 'p-3'
              }"
            />

            <UNavigationMenu 
              :items="manageLinks"
              orientation="vertical" 
              class="mb-4"
              :ui="{
                link: 'p-3'
              }"
            />
          </div>
          <div v-else class="space-y-4">
            <USkeleton class="h-6 w-full" />
            <USkeleton class="h-6 w-full" />
            <USkeleton class="h-6 w-full" />
            <USkeleton class="h-6 w-full" />
            <USkeleton class="h-6 w-full" />
            <USkeleton class="h-6 w-full" />
          </div>
        </div>
        <div class="p-6 lg:col-span-5 col-span-10">
          <div class="border-b border-muted pb-6 mb-6">
            <UContainer>
              <div class="flex justify-between">
                <div>
                  <div class="flex items-center gap-4 mb-4">
                    <h1 class="text-xl tracking-tight text-zinc-100">{{ applicationSchema?.display_name }}</h1>
                    <UBadge v-if="service?.stack_type === 'SPA'" color="success" variant="subtle">STATIC</UBadge>
                    <UBadge v-if="service?.stack_type === 'FUNCTION'" color="secondary" variant="subtle">LAMBDA</UBadge>
                    <UBadge v-if="service?.stack_type === 'WEB_SERVICE'" color="info" variant="subtle">WEB SERVICE</UBadge>
                  </div>
                  <div class="flex items-center gap-6">
                    <div class="flex items-center gap-2">
                      <NuxtLink 
                        :to="`https://github.com/${service?.owner}/${service?.repo}`" 
                        target="_blank" 
                        class="text-muted hover:text-white transition-colors"
                      >
                        <span class="flex items-center justify-center gap-1">
                          <Icon name="tabler:brand-github" class="w-4 h-4 mt-1" />
                          <span class="text-sm">{{service?.owner}} / {{service?.repo}}</span>
                        </span>
                      </NuxtLink>
                      <NuxtLink 
                        :to="`https://github.com/${service?.owner}/${service?.repo}/tree/${service?.branch}`" 
                        target="_blank" 
                        class="text-muted hover:text-white transition-colors"
                      >
                        <span class="flex items-center justify-center gap-1">
                          <Icon name="tabler:git-branch" class="w-4 h-4 mt-1" />
                          <span class="text-sm">{{service?.branch}}</span>
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
                      class="inline-block text-sm text-muted hover:text-white transition-colors"
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
              <!-- <pre>{{ applicationSchema }}</pre> -->
              <template #fallback>
                <div class="flex justify-between">
                  <div class="space-y-4">
                    <div class="flex items-center gap-4">
                      <USkeleton class="h-7 w-48" />
                    </div>
                    <div class="flex items-center gap-6">
                      <USkeleton class="h-4 w-32" />
                      <USkeleton class="h-4 w-24" />
                    </div>
                    <USkeleton class="h-4 w-64" />
                  </div>
                  <USkeleton class="h-10 w-24" />
                </div>
              </template>
            </UContainer> 
          </div>
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
import { watch, computed, onUnmounted } from 'vue';
import type { NavigationMenuItem } from '@nuxt/ui'
import { useApplications } from '~/composables/useApplications';
import Header from '~/components/Header.vue';
import { AppDeployCommitModal, AppDeployLatestModal } from '#components';

const route = useRoute();
const { $client } = useNuxtApp();
const { applicationSchema, setApplicationSchemaById, currentEnvironment: environment, currentService, clearApplicationSchema, hasAccessToApp, isLoading, refreshApplicationSchema } = useApplications();
const supabase = useSupabaseClient();
const provider = computed(() => environment.value?.provider);
const service = computed(() => currentService.value);
const serviceUrl = computed(() => {
  const resources = service.value?.resources;
  return resources?.CloudFrontDistributionUrl || resources?.ApiGatewayUrl || resources?.LoadBalancerDNS || null;
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

const primaryLinks = computed<NavigationMenuItem[]>(() => {
  const links = [
    {
      label: 'Events',
      to: `/app/${appId.value}`,
    },
    {
      label: 'Settings',
      to: `/app/${appId.value}/settings`,
    },
  ];

    // Only add Runtime Logs for FUNCTION and WEB_SERVICE stack types
  if (serviceType.value === 'FUNCTION' || serviceType.value === 'WEB_SERVICE') {
    links.push({
      label: 'Logs',
      to: `/app/${appId.value}/logs`,
    });
  }

  return links;
});

const manageLinks = computed<NavigationMenuItem[]>(() => {
  const links = [
    {
      label: 'Environment Variables',
      to: `/app/${appId.value}/variables`,
    },
    {
      label: 'Domains',
      to: `/app/${appId.value}/domains`,
    }
  ];
  
  // Only add Headers and Redirects for SPA stack type
  if (serviceType.value === 'SPA') {
    links.push(
      {
        label: 'Headers',
        to: `/app/${appId.value}/headers`,
      },
      {
        label: 'Redirects',
        to: `/app/${appId.value}/redirects`,
      }
    );
  }
  
  return links;
});

async function openDeployCommitModal() {
  const deployCommitModal = overlay.create(AppDeployCommitModal, {
    props: {
      service: service.value,
      environment: environment.value
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
      service: service.value,
      environment: environment.value
    }
  });

  const sha = await deployLatestModal.open().result;
  // DeployLatestModal triggers the pipeline itself and shows feedback; no further action required here.
}

async function deployCommit(sha?: string) {  
  try {
    await $client.services.triggerPipeline.mutate({
      providerId: provider.value.id,
      serviceId: service.value.id,
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
})

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