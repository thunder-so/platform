<template>
  <div>
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

          <NuxtLink v-if="activity.type === 'event'" :to="`/app/${applicationSchema?.id}/deploys/${activity.id}`">
            <span v-if="activity.status === 'STARTED'">
              Deploy started for {{ activity.sourceDetails?.revisionId?.substring(0, 7) }}
            </span>
            <span v-if="activity.status === 'SUCCEEDED'">
              Deploy success for {{ activity.sourceDetails?.revisionId?.substring(0, 7) }}
            </span>
            <span v-if="activity.status === 'FAILED'">
              Deploy failed for {{ activity.sourceDetails?.revisionId?.substring(0, 7) }}
            </span>
          </NuxtLink>

          <p class="text-gray-500 text-sm mt-1">{{ useTimeAgo(new Date(activity.timestamp)).value }}</p>
        </div>
        <UButton v-if="activity.type === 'event' && activity.status === 'FAILED'"
         label="Rollback" 
         color="neutral" 
         variant="outline" 
         size="md" 
        />
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

definePageMeta({
  layout: 'app',
});

const supabase = useSupabaseClient();
const route = useRoute();
const { applicationSchema } = useApplications();

const getStatusIcon = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  
  if (['STARTED'].includes(normalizedStatus)) {
    return 'ix:rocket';
  }
  if (['IN_PROGRESS'].includes(normalizedStatus)) {
    return 'line-md:loading-loop';
  }
  if (['FAILED', 'FAULT', 'TIMED_OUT'].includes(normalizedStatus)) {
    return 'ix:certificate-error';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'ix:certificate-success';
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

interface ActivityItem {
  id: string;
  type: 'build' | 'event';
  timestamp: string;
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
  timestamp: build.created_at,
  status: build.build_status as string,
  message: `Build ${build.build_status?.toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!build.build_log,
  logId: build.id,
});

const transformEventToActivityItem = (event: Event): ActivityItem => ({
  id: event.pipeline_execution_id,
  type: 'event',
  timestamp: event.created_at,
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

    activities.value = [...transformedBuilds, ...transformedEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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