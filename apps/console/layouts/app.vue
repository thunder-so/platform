<template>
  <div>
    <Header :mobile-menu-items="[...primaryLinks, ...manageLinks]" />
    
    <UMain>
      <div class="grid grid-cols-6 gap-0 min-h-[calc(100vh-4rem)]">
        <div class="col-span-1 p-6 border-r border-muted lg:block hidden">
          <div v-if="applicationSchema">
            <div class="pb-2">
              <UButton :to="`/org/${applicationSchema?.organization_id}`" variant="ghost" size="sm" leading-icon="i-lucide-arrow-left">
                Dashboard
              </UButton>
            </div>

            <UNavigationMenu 
              :items="primaryLinks"
              orientation="vertical" 
              class="mb-4"
              :ui="{
                link: 'p-3'
              }"
            />

            <hr class="border border-muted mb-4" />
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
            <ClientOnly>
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
                          <Icon name="mdi:github" class="w-4 h-4 mt-1 text-muted" />
                          <span class="text-sm">{{service?.owner}} / {{service?.repo}}</span>
                        </span>
                      </NuxtLink>
                      <span class="flex items-center justify-center gap-1">
                        <Icon name="mdi:source-branch" class="w-4 h-4 mt-1 text-muted" />
                        <span class="text-sm text-muted">{{service?.branch}}</span>
                      </span>
                    </div>
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="mdi:aws" class="h-5 w-5 mt-1 text-muted" />
                      <span class="text-sm text-muted">{{ provider?.alias }} / {{ environment?.region }}</span>
                    </div>
                  </div>
                  <div v-if="service?.resources?.CloudFrontDistributionUrl" class="mt-2 text-left">
                    <NuxtLink 
                      :to="`${service.resources.CloudFrontDistributionUrl}`" 
                      target="_blank" 
                      class="inline-block text-sm text-muted hover:text-white transition-colors"
                    >
                      <span class="flex items-center gap-1">
                        <Icon name="mdi:link" class="w-4 h-4 mt-1 text-muted" />
                        <span>{{service.resources.CloudFrontDistributionUrl}}</span>
                      </span>
                    </NuxtLink>
                  </div>
                  <div v-if="service?.resources?.ApiGatewayUrl" class="mt-2 text-left">
                    <NuxtLink 
                      :to="`${service.resources.ApiGatewayUrl}`" 
                      target="_blank" 
                      class="inline-block text-sm text-muted hover:text-white transition-colors"
                    >
                      <span class="flex items-center gap-1">
                        <Icon name="mdi:link" class="w-4 h-4 mt-1 text-muted" />
                        <span>{{service.resources.ApiGatewayUrl}}</span>
                      </span>
                    </NuxtLink>
                  </div>
                  <div v-if="service?.resources?.LoadBalancerDNS" class="mt-2 text-left">
                    <NuxtLink 
                      :to="`${service.resources.LoadBalancerDNS}`" 
                      target="_blank" 
                      class="inline-block text-sm text-muted hover:text-white transition-colors"
                    >
                      <span class="flex items-center gap-1">
                        <Icon name="mdi:link" class="w-4 h-4 mt-1 text-muted" />
                        <span>{{service.resources.LoadBalancerDNS}}</span>
                      </span>
                    </NuxtLink>
                  </div>
                </div>
                <div class="flex justify-center items-center">
                  <div v-if="service?.resources">
                    <UPopover
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
                        trailing-icon="i-lucide-chevron-down"
                      />

                      <template #content>
                        <div class="p-2">
                          <ul class="space-y-1">
                            <li>
                              <UButton class="w-full" variant="ghost" label="Deploy latest commit" @click="openDeployLatestModal" />
                            </li>
                            <li>
                              <UButton class="w-full" variant="ghost" label="Deploy specific commit" @click="openDeployCommitModal" />
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
            </ClientOnly>
            </UContainer> 
          </div>
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
import { useApplications } from '~/composables/useApplications';
import Header from '~/components/Header.vue';
import { AppDeployCommitModal, AppDeployLatestModal } from '#components';

const route = useRoute();
const { $client } = useNuxtApp();
const { applicationSchema, setApplicationSchemaById, currentEnvironment: environment, currentService: service } = useApplications();
const provider = computed(() => environment.value?.provider);
const toast = useToast();
const overlay = useOverlay();

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

watch(() => route.params.app_id, (newAppId) => {
  if (newAppId) {
    const found = setApplicationSchemaById(newAppId as string);
    if (!found) {
      navigateTo('/404');
    }
  }
}, { immediate: true });
</script>