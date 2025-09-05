<template>
  <div>
    <Header />
    
    <UMain>
      <div class="grid grid-cols-6 gap-0 min-h-[calc(100vh-4rem)]">
        <div class="col-span-1 p-6 border-r border-muted lg:block hidden">
          <div class="pb-2">
            <UButton :to="`/org/${applicationSchema?.organization_id}`" variant="ghost" size="sm" leading-icon="i-lucide-arrow-left">
              Dashboard
            </UButton>
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

          <h3 class="text-xs uppercase p-3">
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
                      <span class="flex items-center justify-center items-center gap-1.5">
                        <Icon name="mdi:github" class="w-4 h-4 mt-1 text-muted" />
                        <span class="text-sm text-muted">{{service?.owner}} / {{service?.repo}}</span>
                      </span>
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
              <!-- <pre>{{ applicationSchema }}</pre> -->
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

const route = useRoute();
const { applicationSchema, setApplicationSchemaById, isLoading } = useApplications();

const environment = computed(() => applicationSchema.value?.environments?.[0] || {});
const provider = computed(() => environment.value?.provider);
const service = computed(() => environment.value?.services?.[0]);
// Use the route param for navigation immediately when present (falls back to loaded schema id).
const appId = computed(() => {
  const param = route.params.app_id as string | undefined;
  return param ?? applicationSchema.value?.id;
});
const envId = computed(() => environment.value?.id);
const serviceType = computed(() => service.value?.stack_type);

const primaryLinks = computed<NavigationMenuItem[]>(() => {
  return [
    {
      label: 'Events',
      to: `/app/${appId.value}`,
    },
    {
      label: 'Settings',
      to: `/app/${appId.value}/env/${envId.value}/settings`,
    },
  ];
});

const manageLinks = computed<NavigationMenuItem[]>(() => {
  const links = [
    {
      label: 'Environment',
      to: `/app/${appId.value}/env/${envId.value}/variables`,
    },
    {
      label: 'Domains',
      to: `/app/${appId.value}/env/${envId.value}/domains`,
    }
  ];
  
  // Only add Headers and Redirects for SPA stack type
  if (serviceType.value === 'SPA') {
    links.push(
      {
        label: 'Headers',
        to: `/app/${appId.value}/env/${envId.value}/headers`,
      },
      {
        label: 'Redirects',
        to: `/app/${appId.value}/env/${envId.value}/redirects`,
      }
    );
  }
  
  return links;
});

watch(() => route.params.app_id, (newAppId) => {
  if (newAppId) {
    const found = setApplicationSchemaById(newAppId as string);
    if (!found) {
      navigateTo('/404');
    }
  }
}, { immediate: true });
</script>