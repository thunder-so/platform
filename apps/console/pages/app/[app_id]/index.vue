<template>
  <div>
    <div v-if="loading">Loading activities...</div>
    <div v-else-if="error">Error fetching activities: {{ error.message }}</div>
    <div v-else-if="activities.length">
      <div v-for="activity in activities" :key="activity.id" class="p-4 mb-2 border border-muted rounded flex items-center gap-4">
        <Icon 
          :name="getStatusIcon(activity.status)" 
          :class="getStatusIconClass(activity.status)"
          size="24"
        />
        <div class="flex-1">
          <p v-if="activity.type === 'build' && activity.status === 'IN_PROGRESS'">
            Build started
          </p>
          <p v-if="activity.type === 'build' && activity.status === 'SUCCEEDED'">
            Build completed successfully
          </p>
          <p v-if="activity.type === 'build' && activity.status === 'FAILED' || activity.status === 'FAULT' || activity.status === 'TIMED_OUT'">
            Build failed
          </p>

          <p v-if="activity.type === 'event' && activity.status === 'STARTED'">
            Deploy started for {{ activity.sourceDetails?.revisionId?.substring(0, 7) }}
          </p>
          <p v-if="activity.type === 'event' && activity.status === 'SUCCEEDED'">
            Deploy success for {{ activity.sourceDetails?.revisionId?.substring(0, 7) }}
          </p>
          <p v-if="activity.type === 'event' && activity.status === 'FAILED'">
            Deploy failed for {{ activity.sourceDetails?.revisionId?.substring(0, 7) }}
          </p>

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
    <div v-else>No activities found for this application.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
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

if (!applicationSchema.value) {
  throw new Error('Application schema not found.');
}

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
const loading = ref(false);
const error = ref<{ message: string } | null>(null);

// const UBadge = resolveComponent('UBadge');
// const UButton = resolveComponent('UButton');

const transformBuildToActivityItem = (build: Build): ActivityItem => ({
  id: build.id,
  type: 'build',
  timestamp: build.created_at,
  status: build.build_status,
  message: `Build ${build.build_status.toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!build.build_log,
  logId: build.id,
});

const transformEventToActivityItem = (event: Event): ActivityItem => ({
  id: event.pipeline_execution_id,
  type: 'event',
  timestamp: event.created_at,
  status: event.pipeline_state,
  message: `Pipeline ${event.pipeline_state.toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!event.pipeline_log,
  logId: event.pipeline_execution_id,
  sourceDetails: event.pipeline_metadata as ActivityItem['sourceDetails'],
});

// const columns = [
//   {
//     accessorKey: 'type',
//     header: 'Type',
//     cell: ({ row }: { row: ActivityItem }) => h('div', {}, row.type === 'build' ? 'Build' : 'Pipeline Event'),
//   },
//   {
//     accessorKey: 'message',
//     header: 'Description',
//   },
//   {
//     accessorKey: 'status',
//     header: 'Status',
//     cell: ({ row }: { row: ActivityItem }) => h(UBadge, { color: 'primary', variant: 'subtle' }, () => row.status),
//   },
//   {
//     accessorKey: 'source',
//     header: 'Source',
//     cell: ({ row }: { row: ActivityItem }) => {
//       if (row.type === 'event' && row.sourceDetails?.revisionUrl) {
//         return h('a', { href: row.sourceDetails.revisionUrl, target: '_blank', class: 'text-blue-500 hover:underline' }, row.sourceDetails.revisionSummary || 'View Source');
//       }
//       return '';
//     },
//   },
//   {
//     accessorKey: 'timestamp',
//     header: 'Timestamp',
//     cell: ({ row }: { row: ActivityItem }) => {
//       const date = new Date(row.timestamp).toLocaleString('en-US', {
//         day: 'numeric',
//         month: 'short',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: false,
//       });
//       return h('div', { class: 'font-medium' }, date);
//     },
//   },
//   {
//     accessorKey: 'logs',
//     header: 'Logs',
//     cell: ({ row }: { row: ActivityItem }) => {
//       return h(UButton, {
//         size: 'sm',
//         variant: 'ghost',
//         icon: 'i-heroicons-document-text',
//         disabled: !row.logAvailable,
//         onClick: () => {
//           // TODO: Navigate to log details page
//           console.log(`View logs for ${row.type} with ID: ${row.logId}`);
//         },
//       }, () => 'View Logs');
//     },
//   },
// ];

const fetchActivities = async (envId: string) => {
  loading.value = true;
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

onMounted(() => {
  if (environment.value?.id) {
    fetchActivities(environment.value.id);

    // Setup Realtime Subscriptions
    supabase
      .channel(`builds:${environment.value.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builds', filter: `environment_id=eq.${environment.value.id}` }, (payload) => {
        const newBuild = payload.new as Build;
        const oldBuild = payload.old as Build;
        const transformed = transformBuildToActivityItem(newBuild);

        if (payload.eventType === 'INSERT') {
          activities.value.unshift(transformed);
        } else if (payload.eventType === 'UPDATE') {
          const index = activities.value.findIndex(item => item.id === transformed.id && item.type === 'build');
          if (index !== -1) {
            activities.value[index] = transformed;
          }
        }
        // Keep only the latest 50 activities
        if (activities.value.length > 50) {
          activities.value = activities.value.slice(0, 50);
        }
      })
      .subscribe();

    supabase
      .channel(`events:${environment.value.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `environment_id=eq.${environment.value.id}` }, (payload) => {
        const newEvent = payload.new as Event;
        const oldEvent = payload.old as Event;
        const transformed = transformEventToActivityItem(newEvent);

        if (payload.eventType === 'INSERT') {
          activities.value.unshift(transformed);
        } else if (payload.eventType === 'UPDATE') {
          const index = activities.value.findIndex(item => item.id === transformed.id && item.type === 'event');
          if (index !== -1) {
            activities.value[index] = transformed;
          }
        }
        // Keep only the latest 50 activities
        if (activities.value.length > 50) {
          activities.value = activities.value.slice(0, 50);
        }
      })
      .subscribe();
  }
});

onUnmounted(() => {
  if (environment.value?.id) {
    supabase.removeChannel(supabase.channel(`builds:${environment.value.id}`));
    supabase.removeChannel(supabase.channel(`events:${environment.value.id}`));
  }
});
</script>