<template>
  <div>
    <Header />
    
    <div class="app-container">
      <aside class="sidebar border-r border-muted">
        <div class="pb-2 border-b border-muted mb-4">
          <NuxtLink :to="`/org/${applicationSchema?.organization_id}`" class="text-sm button flex items-center gap-1">
            <UIcon name="i-lucide-arrow-left" />
            Dashboard
          </NuxtLink>

          <h2 class="pt-2 text-xl font-medium">{{ applicationSchema?.display_name }}</h2>
        </div>

        <UNavigationMenu 
          v-if="applicationSchema"
          :items="primaryLinks"
          orientation="vertical" 
          class="mb-4"
          :ui="{
            link: 'p-3'
          }"
        />

        <h3 class="text-xs uppercase pl-3 pr-3 mb-2">
          Manage
        </h3>
        <UNavigationMenu 
          v-if="applicationSchema"
          :items="manageLinks"
          orientation="vertical" 
          class="mb-4"
          :ui="{
            link: 'p-3'
          }"
        />
      </aside>
      <main class="main-content">
        <div class="border-b border-muted pb-6 mb-6">
          <UContainer>
          <ClientOnly>
            <div class="flex justify-between">
              <div>
                <div class="flex items-center gap-4 mb-4">
                  <h1 class="text-xl tracking-tight text-zinc-100">{{ applicationSchema?.display_name }}</h1>
                  <UBadge v-if="service?.stack_type === 'SPA'" color="success" variant="subtle">STATIC</UBadge>
                </div>
                <div class="flex items-center gap-6">
                  <div class="flex items-center gap-2">
                    <span class="flex items-center justify-center gap-1.5">
                      <Icon name="mdi:github" class="w-4 h-4 text-muted" />
                      <span class="text-sm text-muted">{{service?.pipeline_props?.sourceProps?.owner}} / {{service?.pipeline_props?.sourceProps?.repo}}</span>
                    </span>
                    <span class="flex items-center justify-center gap-1">
                      <Icon name="mdi:source-branch" class="w-4 h-4 text-muted" />
                      <span class="text-sm text-muted">{{service?.pipeline_props?.sourceProps?.branchOrRef}}</span>
                    </span>
                  </div>
                  <div class="flex items-center justify-center gap-2">
                    <Icon name="mdi:aws" class="h-5 w-5 text-muted" />
                    <span class="text-sm text-muted">{{ provider?.alias }} / {{ environment?.region }}</span>
                  </div>
                </div>
              </div>
              <div class="flex justify-center items-center">
                <div>
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
                            <UButton class="w-full" variant="ghost" label="Deploy latest commit" @click="() => {}" />
                          </li>
                          <li>
                            <UButton class="w-full" variant="ghost" label="Deploy specific commit" @click="() => {}" />
                          </li>
                        </ul>
                      </div>
                    </template>
                  </UPopover>
                </div>
              </div>
            </div>
          </ClientOnly>
          </UContainer> 
        </div>
        <UContainer>
          <slot />
        </UContainer>
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
  navigateTo('/404');
}
const environment = applicationSchema.value?.environments?.[0];
const provider = environment?.provider;
const service = environment?.services?.[0];
const appId = applicationSchema.value?.id;
const envId = environment?.id;
const serviceType = service?.stack_type;

const primaryLinks = computed<NavigationMenuItem[]>(() => {
  return [
    {
      label: 'Events',
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