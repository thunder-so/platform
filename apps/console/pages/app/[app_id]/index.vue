<template>
  <div>
    <div v-if="showStackUpgrade" class="mb-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="ix:info" class="text-blue-500" size="16" />
            <h3>Stack update available</h3>
          </div>
        </template>
        <p class="text-muted text-sm mb-2">
          A newer version of the stack is available. Click Upgrade Stack to rebuild your service with the latest version.
        </p>
        <p class="text-muted text-sm mb-4">
          Current version: {{ service?.stack_version }} 
          <br />Latest version: {{ latestStackVersion }}
        </p>
        <UButton 
          label="Upgrade Stack" 
          color="primary" 
          :loading="upgrading"
          @click="upgradeStack"
        />
      </UCard>
    </div>

    <div v-if="loading">
      <div class="flex flex-col gap-4 mt-7">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-6 w-full" />
        </div>
      </div>
    </div>

    <div v-else-if="error">
      <UAlert v-if="error" color="warning" variant="soft" class="mb-3">
        <template #title>{{ error.message }}</template>
      </UAlert>
    </div>

    <div v-else-if="activities.length">
      <div v-for="activity in activities" :key="activity.id" class="p-4 mb-2 border border-muted rounded flex items-center gap-4">
        <Icon 
          :name="getStatusIcon(activity.status)" 
          :class="getStatusIconClass(activity.status)"
          size="24"
        />
        <div class="flex-1">
          <NuxtLink v-if="activity.type === 'build'" :to="`/app/${applicationSchema?.id}/builds/${activity.id}`">
            <span v-if="activity.status === 'IN_PROGRESS'">Build started</span>
            <span v-if="activity.status === 'SUCCEEDED'">Build completed successfully</span>
            <span v-if="activity.status === 'FAILED' || activity.status === 'FAULT' || activity.status === 'TIMED_OUT'">Build failed</span>
          </NuxtLink>

          <div v-if="activity.type === 'event'" class="grid grid-cols-4 gap-2">
            <div class="flex items-center text-left text-md">
              <NuxtLink :to="`/app/${applicationSchema?.id}/deploys/${activity.id}`">
                {{ activity.id.substring(0, 7) }}
              </NuxtLink>
            </div>

            <div class="flex flex-col text-left">
              <p class="text-sm text-muted">{{ useTimeAgo(new Date(activity.timestamp_start)).value }}</p>
              <p class="text-sm text-muted">{{ getDuration(activity) }}</p>
            </div>

            <div class="flex flex-col text-left">
              <div class="leading-none">
                <NuxtLink 
                  :to="`https://github.com/${service?.owner}/${service?.repo}/tree/${service?.branch}`" 
                  target="_blank" 
                  class="inline-flex text-muted hover:text-white transition-colors"
                >
                  <span class="flex items-center gap-1">
                    <Icon name="mdi:source-branch" class="w-4 h-4" />
                    <span class="text-sm">{{service?.branch}}</span>
                  </span>
                </NuxtLink>
              </div>
              <div class="leading-none">
                <NuxtLink 
                  :to="`https://github.com/${service?.owner}/${service?.repo}/commit/${activity.sourceDetails?.revisionId}`" 
                  target="_blank" 
                  class="inline-flex text-muted hover:text-white transition-colors"
                >
                  <span class="flex items-center gap-1">
                    <Icon name="fa6-solid:code-commit" class="w-4 h-4" />
                    <span class="text-sm">{{ activity.sourceDetails?.revisionId?.substring(0, 7) }}</span>
                  </span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
        <div v-if="activity.type === 'event'">
          <UPopover
            v-model:open="activityMenuOpen[activity.id]"
            mode="click"
            :content="{ align: 'end', side: 'bottom' }"
          >
            <UButton size="sm" icon="i-heroicons-ellipsis-horizontal" color="neutral" variant="ghost" />
            
            <template #content>
              <div class="py-1">
                <NuxtLink :to="`/app/${applicationSchema?.id}/deploys/${activity.id}`" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800">
                  <Icon name="i-heroicons-eye" class="mr-2" />
                  <span>Inspect Deployment</span>
                </NuxtLink>
                <div @click="() => copyUrl(activity.id)" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer">
                  <Icon name="i-heroicons-clipboard" class="mr-2" />
                  <span>Copy URL</span>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
    <div v-else>No activities found on this application.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSupabaseClient } from '#imports';
import { useApplications } from '~/composables/useApplications';
import type { Build, Event } from '~/server/db/schema';
import { useTimeAgo } from '@vueuse/core';

const { $client } = useNuxtApp();
const appConfig = useAppConfig();

definePageMeta({
  layout: 'app',
});

const supabase = useSupabaseClient();
const route = useRoute();
const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $trpc } = useNuxtApp();
const toast = useToast();
const overlay = useOverlay();

const upgrading = ref(false);
const activityMenuOpen = ref<Record<string, boolean>>({});

const copyUrl = (activityId: string) => {
  const url = `${window.location.origin}/app/${applicationSchema.value?.id}/deploys/${activityId}`;
  navigator.clipboard.writeText(url);
  activityMenuOpen.value[activityId] = false;
  toast.add({ description: 'URL copied to clipboard' });
};

const getStatusIcon = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  
  if (['STARTED'].includes(normalizedStatus)) {
    return 'line-md:loading-loop';
  }
  if (['IN_PROGRESS'].includes(normalizedStatus)) {
    return 'line-md:loading-loop';
  }
  if (['FAILED', 'FAULT', 'TIMED_OUT'].includes(normalizedStatus)) {
    return 'material-symbols:warning-outline-rounded';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'material-symbols:bookmark-check';
  }
  return 'ix:about';
};

const getStatusIconClass = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  
  if (['STARTED', 'IN_PROGRESS'].includes(normalizedStatus)) {
    return 'text-yellow-500';
  }
  if (['FAILED', 'FAULT', 'TIMED_OUT'].includes(normalizedStatus)) {
    return 'text-error';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'text-success';
  }
  return 'text-gray-500';
};

const environment = computed(() => applicationSchema.value?.environments?.[0]);
const service = computed(() => environment.value?.services?.[0]);

const latestStackVersion = computed(() => {
  if (!service.value?.stack_type) return null;
  const stack = appConfig.stacks.find(s => s.type === service.value?.stack_type);
  return stack?.version || null;
});

const showStackUpgrade = computed(() => {
  return service.value?.stack_version && 
         latestStackVersion.value && 
         service.value.stack_version !== latestStackVersion.value;
});

const upgradeStack = async () => {
  if (!service.value?.id || !latestStackVersion.value) return;
  
  try {
    upgrading.value = true;
    await $client.services.upgradeStack.mutate({
      service_id: service.value.id,
      stack_version: latestStackVersion.value
    });
    
    // Refresh application data to show updated version
    await refreshApplicationSchema();
  } catch (error) {
    console.error('Failed to upgrade stack:', error);
  } finally {
    upgrading.value = false;
  }
};

const getDuration = (activity: ActivityItem) => {
  if (!activity.timestamp_start) return 'Duration: -';
  const start = new Date(activity.timestamp_start);
  const end = activity.timestamp_end ? new Date(activity.timestamp_end) : new Date();
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `Duration: ${mins}m ${secs}s`;
};

interface ActivityItem {
  id: string;
  type: 'build' | 'event';
  timestamp_start: Date | null;
  timestamp_end: Date | null;
  status: string;
  message: string;
  logAvailable: boolean;
  logId: string;
  sourceDetails?: {
    entityUrl?: string;
    revisionId?: string;
    revisionUrl?: string;
    revisionSummary?: string;
  };
}

const activities = ref<ActivityItem[]>([]);
const loading = ref(true);
const error = ref<{ message: string } | null>(null);

const transformBuildToActivityItem = (build: Build): ActivityItem => ({
  id: build.id,
  type: 'build',
  timestamp_start: build.build_start,
  timestamp_end: build.build_end,
  status: build.build_status as string,
  message: `Build ${build.build_status?.toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!build.build_log,
  logId: build.id,
});

const transformEventToActivityItem = (event: Event): ActivityItem => ({
  id: event.pipeline_execution_id,
  type: 'event',
  timestamp_start: event.pipeline_start,
  timestamp_end: event.pipeline_end,
  status: event.pipeline_state as string,
  message: `Pipeline ${event.pipeline_state?.toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!event.pipeline_log,
  logId: event.pipeline_execution_id,
  sourceDetails: event.pipeline_metadata as ActivityItem['sourceDetails'],
});

const fetchActivities = async (envId: string) => {
  try {
    const [buildsResponse, eventsResponse] = await Promise.all([
      supabase.from('builds').select('*').eq('environment_id', envId).is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
      supabase.from('events').select('*').eq('environment_id', envId).is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
    ]);

    if (buildsResponse.error) throw buildsResponse.error;
    if (eventsResponse.error) throw eventsResponse.error;

    const transformedBuilds = (buildsResponse.data as Build[]).map(transformBuildToActivityItem);
    const transformedEvents = (eventsResponse.data as Event[]).map(transformEventToActivityItem);

    activities.value = [...transformedBuilds, ...transformedEvents].sort((a, b) => new Date(b.timestamp_start).getTime() - new Date(a.timestamp_start).getTime());

  } catch (e: any) {
    error.value = e;
  } finally {
    loading.value = false;
  }
};

// Keep references to created channels so we can remove them when env changes/unmount
let buildChannel: any = null;
let eventsChannel: any = null;

const setupRealtimeForEnv = (envId: string) => {
  // cleanup previous channels
  if (buildChannel) supabase.removeChannel(buildChannel);
  if (eventsChannel) supabase.removeChannel(eventsChannel);

  buildChannel = supabase
    .channel(`builds:${envId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'builds', filter: `environment_id=eq.${envId}` }, (payload) => {
      const newBuild = payload.new as Build;
      const transformed = transformBuildToActivityItem(newBuild);

      if (payload.eventType === 'INSERT') {
        activities.value.unshift(transformed);
      } else if (payload.eventType === 'UPDATE') {
        const index = activities.value.findIndex(item => item.id === transformed.id && item.type === 'build');
        if (index !== -1) activities.value[index] = transformed;
      }
      if (activities.value.length > 50) activities.value = activities.value.slice(0, 50);
    })
    .subscribe();

  eventsChannel = supabase
    .channel(`events:${envId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `environment_id=eq.${envId}` }, (payload) => {
      const newEvent = payload.new as Event;
      const transformed = transformEventToActivityItem(newEvent);

      if (payload.eventType === 'INSERT') {
        activities.value.unshift(transformed);
      } else if (payload.eventType === 'UPDATE') {
        const index = activities.value.findIndex(item => item.id === transformed.id && item.type === 'event');
        if (index !== -1) activities.value[index] = transformed;
      }
      if (activities.value.length > 50) activities.value = activities.value.slice(0, 50);
    })
    .subscribe();
};

// When environment becomes available (client-side navigation), fetch and setup realtime
watch(environment, async (env) => {
  if (env?.id) {
    loading.value = true;
    await fetchActivities(env.id);
    setupRealtimeForEnv(env.id);
    loading.value = false;
  } else {
    // clear state if environment not available
    activities.value = [];
  }
}, { immediate: true });

onUnmounted(() => {
  if (buildChannel) supabase.removeChannel(buildChannel);
  if (eventsChannel) supabase.removeChannel(eventsChannel);
});
</script>