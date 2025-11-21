<template>
  <div>
    <!-- Stack Upgrade -->
    <div v-if="showStackUpgrade" class="mb-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="tabler:info-circle" class="text-blue-500" size="16" />
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

    <!-- Filters: View, Date Range, Status, Pagination -->
    <div class="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-muted">View:</label>
        <USelect 
          v-model="selectedView" 
          :items="[{value: 'all', label: 'Show all'}, {value: 'builds', label: 'Builds'}, {value: 'events', label: 'Deploys'}]"
          size="lg"
          class="w-48" 
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm text-muted">Date:</label>
        <USelect 
          v-model="selectedDateRangeKey" 
          :items="dateRangeOptions.map(opt => ({value: opt.key, label: opt.label}))"
          size="lg"
          class="w-64" 
        />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <label class="text-sm text-muted">Status:</label>
        <USelect 
          v-model="selectedStatus" 
          :items="[{value: 'all', label: 'Show all'}, ...statusOptions.map(s => ({value: s, label: s}))]"
          size="lg"
          class="w-48" 
        />
      </div>
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

    <div v-else-if="paginatedActivities.length">
      <div v-for="activity in paginatedActivities" :key="activity.id + '-' + activity.type" class="p-4 mb-2 border border-muted rounded flex items-center gap-4">
        <Icon 
          :name="getStatusIcon(activity.status)" 
          :class="getStatusIconClass(activity.status)"
          size="24"
        />
        <div class="flex-1">
          <div v-if="activity.type === 'build'" class="grid grid-cols-4 gap-2 w-full">
            <div class="flex items-center text-left text-md">
              <NuxtLink :to="`/app/${applicationSchema?.id}/builds/${activity.id}`">
                {{ `Build #${getBuildNumber(activity.id)}` }}
              </NuxtLink>
            </div>

            <div class="flex flex-col text-left">
              <p class="text-sm text-muted">{{ activity.timestamp_start ? useTimeAgo(new Date(activity.timestamp_start)).value : '-' }}</p>
              <p class="text-sm text-muted">{{ getDuration(activity) }}</p>
            </div>

            <div class="col-span-2"></div>
          </div>

          <div v-else-if="activity.type === 'event'" class="grid grid-cols-4 gap-2">
            <div class="flex items-center text-left text-md">
              <NuxtLink :to="`/app/${applicationSchema?.id}/deploys/${activity.id}`">
                {{ activity.id.substring(0, 7) }}
              </NuxtLink>
            </div>

            <div class="flex flex-col text-left">
              <p class="text-sm text-muted">{{ activity.timestamp_start ? useTimeAgo(new Date(activity.timestamp_start)).value : '-' }}</p>
              <p class="text-sm text-muted">{{ getDuration(activity) }}</p>
            </div>

            <div class="flex flex-col col-span-2 text-left">
              <div class="leading-none">
                <NuxtLink 
                  :to="`https://github.com/${service?.owner}/${service?.repo}/tree/${service?.branch}`" 
                  target="_blank" 
                  class="inline-flex text-muted hover:text-white transition-colors"
                >
                  <span class="flex items-center gap-1">
                    <Icon name="tabler:git-branch" class="w-4 h-4" />
                    <span class="text-sm">{{service?.branch}}</span>
                  </span>
                </NuxtLink>
              </div>
              <div class="leading-none">
                <div class="flex flex-row gap-2">
                  <NuxtLink 
                    :to="`https://github.com/${service?.owner}/${service?.repo}/commit/${activity.sourceDetails?.revisionId}`" 
                    target="_blank" 
                    class="inline-flex text-muted hover:text-white transition-colors"
                  >
                    <span class="flex items-center gap-1">
                      <Icon name="tabler:git-commit" class="w-4 h-4" />
                      <span class="text-sm">{{ activity.sourceDetails?.revisionId?.substring(0, 7) }}</span>
                    </span>
                  </NuxtLink>

                  <span class="text-sm">{{ activity.sourceDetails?.revisionSummary }}</span>
                </div>
                
              </div>
            </div>
          </div>
        </div>
        <div>
          <UPopover
            v-model:open="activityMenuOpen[activity.id]"
            mode="click"
            :content="{ align: 'end', side: 'bottom' }"
          >
            <UButton size="sm" icon="tabler:dots-vertical" color="neutral" variant="ghost" />
            
            <template #content>
              <div class="py-1">
                <NuxtLink v-if="activity.type === 'event'" :to="`/app/${applicationSchema?.id}/deploys/${activity.id}`" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800">
                  <Icon name="tabler:eye" class="mr-2" />
                  <span>Inspect Deployment</span>
                </NuxtLink>

                <NuxtLink v-if="activity.type === 'build'" :to="`/app/${applicationSchema?.id}/builds/${activity.id}`" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800">
                  <Icon name="tabler:eye" class="mr-2" />
                  <span>Inspect Build</span>
                </NuxtLink>

                <div @click="() => copyUrl(activity.id, activity.type)" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer">
                  <Icon name="tabler:clipboard" class="mr-2" />
                  <span>Copy URL</span>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between mt-4">
        <div class="text-sm text-muted">Showing {{ startItem }} - {{ endItem }} of {{ activities.length }}</div>
        <div class="flex items-center gap-2">
          <UButton :disabled="page <= 1" @click="goToPage(page - 1)" size="sm" variant="outline">Prev</UButton>
          <UButton 
            v-for="pageNum in pageNumbers" 
            :key="pageNum" 
            @click="goToPage(pageNum)" 
            :variant="pageNum === page ? 'solid' : 'ghost'"
            size="sm"
          >
            {{ pageNum }}
          </UButton>
          <UButton :disabled="endItem >= activities.length" @click="goToPage(page + 1)" size="sm" variant="outline">Next</UButton>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="text-muted text-center py-10">
        <p>No activities found on this application.</p>
        <UButton 
          v-if="selectedView !== 'all' || selectedStatus !== 'all' || selectedDateRangeKey !== 'all'"
          @click="clearFilters" 
          variant="outline" 
          size="sm" 
          class="mt-3"
        >
          Clear Filters
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApplications } from '~/composables/useApplications';
import type { Build, Event } from '~~/server/db/schema';
import { useTimeAgo } from '@vueuse/core';

definePageMeta({
  layout: 'app',
});

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const { applicationSchema, refreshApplicationSchema, clearApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const appConfig = useAppConfig();
const toast = useToast();
const overlay = useOverlay();

const upgrading = ref(false);
const activityMenuOpen = ref<Record<string, boolean>>({});

const environment = computed(() => applicationSchema.value?.environments?.[0]);
const service = computed(() => environment.value?.services?.[0]);

// --- Filter & Pagination state (URL synced) ---
const PAGE_SIZE = 10;

// Status options (simplified)
const statusOptions = [
  'IN PROGRESS', 'SUCCEEDED', 'FAILED'
];

const dateRangeOptions = [
  { key: 'last_hour', label: 'Last hour' },
  { key: 'last_12_hours', label: 'Last 12 hours' },
  { key: 'last_day', label: 'Last day' },
  { key: 'last_3_days', label: 'Last 3 days' },
  { key: 'last_week', label: 'Last week' },
  { key: 'all', label: 'Show all' },
];

// Read initial state from URL
const q = route.query;
const selectedView = ref((q.view as string) || 'all'); // all | builds | events
const selectedStatus = ref((q.status as string) || 'all');
const page = ref(q.page ? Math.max(1, Number(q.page)) : 1);

// date is in the form start-end (epoch ms). If present, add a 'custom' option so the dropdown can reflect it.
let initialDateKey = 'all';
if (q.date && typeof q.date === 'string') {
  initialDateKey = 'custom';
  // ensure custom appears first in options so v-model can bind
  if (!dateRangeOptions.find(d => d.key === 'custom')) {
    dateRangeOptions.unshift({ key: 'custom', label: 'Custom' });
  }
}
const selectedDateRangeKey = ref(initialDateKey);

// parse date param into numeric start/end
const parseDateParam = (val?: string) => {
  if (!val) return null;
  const parts = val.split('-');
  if (parts.length !== 2) return null;
  const s = Number(parts[0]);
  const e = Number(parts[1]);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return { start: s, end: e };
};

const selectedDateRangeParam = ref(parseDateParam(q.date as string | undefined));

const computeRangeForKey = (key: string) => {
  const now = Date.now();
  switch (key) {
    case 'last_hour': return { start: now - 1000 * 60 * 60, end: now };
    case 'last_12_hours': return { start: now - 1000 * 60 * 60 * 12, end: now };
    case 'last_day': return { start: now - 1000 * 60 * 60 * 24, end: now };
    case 'last_3_days': return { start: now - 1000 * 60 * 60 * 24 * 3, end: now };
    case 'last_week': return { start: now - 1000 * 60 * 60 * 24 * 7, end: now };
    case 'custom': return selectedDateRangeParam.value ? { start: selectedDateRangeParam.value.start, end: selectedDateRangeParam.value.end } : null;
    case 'all':
    default: return null;
  }
};

const updateUrl = (opts?: { replace?: boolean }) => {
  const next: Record<string, any> = { ...route.query };
  // view
  if (selectedView.value && selectedView.value !== 'all') next.view = selectedView.value; else delete next.view;
  // status
  if (selectedStatus.value && selectedStatus.value !== 'all') next.status = selectedStatus.value; else delete next.status;
  // page
  if (page.value && page.value > 1) next.page = String(page.value); else delete next.page;
  // date range -> serialize to start-end (epoch ms)
  const range = computeRangeForKey(selectedDateRangeKey.value);
  if (range) next.date = `${range.start}-${range.end}`; else delete next.date;

  const method = opts?.replace ? router.replace : router.push;
  // avoid adding identical history entries
  method({ query: next }).catch(() => {});
};

// sync URL when filters change
watch([selectedView, selectedStatus, selectedDateRangeKey, page], () => updateUrl({ replace: true }));

const mapToDisplayStatus = (status?: string | null) => {
  const normalizedStatus = (status || '').toString().toUpperCase();
  if (['STARTED', 'IN_PROGRESS', 'RESUMED'].includes(normalizedStatus)) {
    return 'IN PROGRESS';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'SUCCEEDED';
  }
  if (['FAILED', 'CANCELED', 'SUPERSEDED', 'FAULT', 'TIMED_OUT', 'STOPPED'].includes(normalizedStatus)) {
    return 'FAILED';
  }
  return null;
};

const copyUrl = (activityId: string, type?: string) => {
  const path = type === 'build' ? 'builds' : 'deploys';
  const url = `${window.location.origin}/app/${applicationSchema.value?.id}/${path}/${activityId}`;
  navigator.clipboard.writeText(url);
  activityMenuOpen.value[activityId] = false;
  toast.add({ description: 'URL copied to clipboard' });
};

// Compute a human-friendly build number (1 = most recent build)
const getBuildNumber = (activityId: string) => {
  const builds = activities.value
    .filter(a => a.type === 'build')
    .slice() // copy
    .sort((a, b) => {
      const ta = a.timestamp_start ? new Date(a.timestamp_start).getTime() : 0;
      const tb = b.timestamp_start ? new Date(b.timestamp_start).getTime() : 0;
      return ta - tb;
    });

  const idx = builds.findIndex(b => b.id === activityId);
  return idx === -1 ? '-' : idx + 1;
};

const getStatusIcon = (status?: string | null) => {
  const normalizedStatus = (status || '').toString().toUpperCase();
  
  if (['STARTED'].includes(normalizedStatus)) {
    return 'line-md:loading-loop';
  }
  if (['IN_PROGRESS'].includes(normalizedStatus)) {
    return 'line-md:loading-loop';
  }
  if (['FAILED', 'FAULT', 'TIMED_OUT'].includes(normalizedStatus)) {
    return 'tabler:alert-square';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'tabler:square-check';
  }
  return 'tabler:info-square';
};

const getStatusIconClass = (status?: string | null) => {
  const normalizedStatus = (status || '').toString().toUpperCase();
  
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

const currentTime = ref(Date.now());

const getDuration = (activity: ActivityItem) => {
  if (!activity.timestamp_start) return 'Duration: -';
  const start = new Date(activity.timestamp_start as string | Date);
  const end = activity.timestamp_end ? new Date(activity.timestamp_end as string | Date) : currentTime.value;
  const diff = Math.floor((end - start.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `Duration: ${mins}m ${secs}s`;
};

// Update current time every second for ticking duration
onMounted(() => {
  const timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
  
  onUnmounted(() => {
    clearInterval(timeInterval);
  });
});

const formatTimeAgo = (ts?: string | Date | null) => {
  if (!ts) return '-';
  try {
    return useTimeAgo(new Date(ts as string | Date)).value;
  } catch (e) {
    return '-';
  }
};

type BaseActivity = {
  id: string;
  timestamp_start: string | Date | null;
  timestamp_end: string | Date | null;
  status: string | null;
  message: string;
  logAvailable: boolean;
  logId: string;
};

type BuildActivity = BaseActivity & { type: 'build' };
type EventActivity = BaseActivity & { type: 'event'; sourceDetails?: { entityUrl?: string; revisionId?: string; revisionUrl?: string; revisionSummary?: string } };
type ActivityItem = BuildActivity | EventActivity;

const activities = ref<ActivityItem[]>([]);
const loading = ref(true);
const error = ref<{ message: string } | null>(null);

const transformBuildToActivityItem = (build: Build): BuildActivity => ({
  id: build.id,
  type: 'build',
  timestamp_start: build.build_start || build.created_at,
  timestamp_end: build.build_end,
  status: (build.build_status as string) || null,
  message: `Build ${String(build.build_status || '').toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!build.build_log,
  logId: build.id,
});

const transformEventToActivityItem = (event: Event): EventActivity => ({
  id: event.pipeline_execution_id,
  type: 'event',
  timestamp_start: event.pipeline_start || event.created_at,
  timestamp_end: event.pipeline_end,
  status: (event.pipeline_state as string) || null,
  message: `Pipeline ${String(event.pipeline_state || '').toLowerCase()} for service ${service.value?.display_name || 'N/A'}`,
  logAvailable: !!event.pipeline_log,
  logId: event.pipeline_execution_id,
  sourceDetails: event.pipeline_metadata as EventActivity['sourceDetails'],
});

const fetchActivities = async (envId: string) => {
  try {
    loading.value = true;

    // Determine date filter
    const range = computeRangeForKey(selectedDateRangeKey.value);

    // Build queries depending on selectedView
    const wantsBuilds = selectedView.value === 'all' || selectedView.value === 'builds';
    const wantsEvents = selectedView.value === 'all' || selectedView.value === 'events';

    const tasks: Promise<any>[] = [];

    if (wantsBuilds) {
      let qBuilds: any = supabase.from('builds').select('*').eq('environment_id', envId).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
      if (range) qBuilds = qBuilds.gte('created_at', new Date(range.start).toISOString()).lte('created_at', new Date(range.end).toISOString());
      tasks.push(qBuilds);
    }

    if (wantsEvents) {
      let qEvents: any = supabase.from('events').select('*').eq('environment_id', envId).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
      if (range) qEvents = qEvents.gte('created_at', new Date(range.start).toISOString()).lte('created_at', new Date(range.end).toISOString());
      tasks.push(qEvents);
    }

    const results = await Promise.all(tasks);

    // Map results back - they will be in same order as tasks array
    const items: ActivityItem[] = [];
    let ri = 0;
    if (wantsBuilds) {
      const res = results[ri++];
      if (res.error) throw res.error;
      const transformedBuilds = (res.data as Build[]).map(transformBuildToActivityItem);
      items.push(...transformedBuilds);
    }
    if (wantsEvents) {
      const res = results[ri++];
      if (res.error) throw res.error;
      const transformedEvents = (res.data as Event[]).map(transformEventToActivityItem);
      items.push(...transformedEvents);
    }

    activities.value = items
      .filter(Boolean)
      .filter(item => {
        if (selectedStatus.value === 'all') return true;
        return mapToDisplayStatus(item.status) === selectedStatus.value;
      })
      .sort((a, b) => {
        const ta = a.timestamp_start ? new Date(a.timestamp_start).getTime() : 0;
        const tb = b.timestamp_start ? new Date(b.timestamp_start).getTime() : 0;
        return tb - ta;
      });

    // reset page if needed
    if ((page.value - 1) * PAGE_SIZE >= activities.value.length) page.value = 1;

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

  // Only subscribe to the channels that we care about given selectedView
  if (selectedView.value === 'all' || selectedView.value === 'builds') {
    buildChannel = supabase
      .channel(`builds:${envId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builds', filter: `environment_id=eq.${envId}` }, (payload) => {
        const newBuild = payload.new as Build;
        const transformed = transformBuildToActivityItem(newBuild);

        // status filter
        if (selectedStatus.value !== 'all' && mapToDisplayStatus(transformed.status) !== selectedStatus.value) return;

        // date filter
        const range = computeRangeForKey(selectedDateRangeKey.value);
        if (range) {
          const ts = newBuild.created_at ? new Date(newBuild.created_at).getTime() : 0;
          if (ts < range.start || ts > range.end) return;
        }

        if (payload.eventType === 'INSERT') {
          activities.value.unshift(transformed);
        } else if (payload.eventType === 'UPDATE') {
          const index = activities.value.findIndex(item => item.id === transformed.id && item.type === 'build');
          if (index !== -1) activities.value[index] = transformed;
        }
        if (activities.value.length > 500) activities.value = activities.value.slice(0, 500);
      })
      .subscribe();
  }

  if (selectedView.value === 'all' || selectedView.value === 'events') {
    eventsChannel = supabase
      .channel(`events:${envId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `environment_id=eq.${envId}` }, (payload) => {
        const newEvent = payload.new as Event;
        const transformed = transformEventToActivityItem(newEvent);

        if (selectedStatus.value !== 'all' && mapToDisplayStatus(transformed.status) !== selectedStatus.value) return;

        const range = computeRangeForKey(selectedDateRangeKey.value);
        if (range) {
          const ts = newEvent.created_at ? new Date(newEvent.created_at).getTime() : 0;
          if (ts < range.start || ts > range.end) return;
        }

        if (payload.eventType === 'INSERT') {
          activities.value.unshift(transformed);
        } else if (payload.eventType === 'UPDATE') {
          const index = activities.value.findIndex(item => item.id === transformed.id && item.type === 'event');
          if (index !== -1) activities.value[index] = transformed;
        }
        if (activities.value.length > 500) activities.value = activities.value.slice(0, 500);
      })
      .subscribe();
  }
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

// Watch filters to refetch and re-subscribe
watch([selectedView, selectedStatus, selectedDateRangeKey], async () => {
  if (environment.value?.id) {
    await fetchActivities(environment.value.id);
    setupRealtimeForEnv(environment.value.id);
  }
});

// --- Pagination computed values ---
const totalPages = computed(() => Math.ceil(activities.value.length / PAGE_SIZE));

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  const pages = [];
  
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
    pages.push(i);
  }
  
  return pages;
});

const startItem = computed(() => Math.min(activities.value.length, (page.value - 1) * PAGE_SIZE + 1));
const endItem = computed(() => Math.min(activities.value.length, page.value * PAGE_SIZE));
const paginatedActivities = computed(() => activities.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

const goToPage = (p: number) => {
  page.value = Math.max(1, p);
};

const clearFilters = () => {
  selectedView.value = 'all';
  selectedStatus.value = 'all';
  selectedDateRangeKey.value = 'all';
  page.value = 1;
};

onUnmounted(() => {
  if (buildChannel) supabase.removeChannel(buildChannel);
  if (eventsChannel) supabase.removeChannel(eventsChannel);
});
</script>