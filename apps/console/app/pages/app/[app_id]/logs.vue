<template>
  <div>
    <div class="flex items-center gap-2 mb-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-muted">Date:</label>
        <USelect 
          v-model="selectedDateRangeKey" 
          :items="dateRangeOptions.map(opt => ({ value: opt.key, label: opt.label }))"
          size="lg"
          class="w-64"
        />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <UButton
          size="sm"
          :variant="live ? 'solid' : 'ghost'"
          :color="live ? 'primary' : 'neutral'"
          @click="toggleLive"
        >
          {{ live ? 'Live: On' : 'Live' }}
        </UButton>

        <UButton
            size="sm"
            variant="outline"
            icon="i-heroicons-arrow-path"
            :loading="refreshing"
            :disabled="refreshing"
            @click="refreshNow"
          />

        <div class="text-sm text-muted">Showing {{ allLogEvents.length }} lines</div>
      </div>
    </div>

    <UAlert v-if="error" color="warning" variant="subtle" class="mb-4" :title="error.message" />

    <div class="h-[calc(100vh-10rem)]">
      <AppLogViewer 
        :log-events="allLogEvents" 
        :loading="pending && allLogEvents.length === 0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

definePageMeta({
  layout: 'app',
});

const { $client } = useNuxtApp();
const { 
  currentService: service,
} = useApplications();

const nextToken = ref<string | undefined>(undefined);
const allLogEvents = ref<any[]>([]);
const live = ref(false);
const seenEventKeys = ref(new Set<string>());
const refreshing = ref(false);
const pollingInterval = ref<NodeJS.Timeout | null>(null);

const dateRangeOptions = [
  { key: 'last_hour', label: 'Last hour' },
  { key: 'last_12_hours', label: 'Last 12 hours' },
  { key: 'last_day', label: 'Last day' },
  { key: 'last_3_days', label: 'Last 3 days' },
  { key: 'last_week', label: 'Last week' },
];

// Read date from URL
const route = useRoute();
const router = useRouter();
const q = route.query;
const selectedDateRangeKey = ref('last_hour');

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
  // If a date param is present in the URL, honor it (treated as a custom range) even
  // though we don't expose a "Custom" option in the UI.
  if (selectedDateRangeParam.value) return { start: selectedDateRangeParam.value.start, end: selectedDateRangeParam.value.end };
  const now = Date.now();
  switch (key) {
    case 'last_hour': return { start: now - 1000 * 60 * 60, end: now };
    case 'last_12_hours': return { start: now - 1000 * 60 * 60 * 12, end: now };
    case 'last_day': return { start: now - 1000 * 60 * 60 * 24, end: now };
    case 'last_3_days': return { start: now - 1000 * 60 * 60 * 24 * 3, end: now };
    case 'last_week': return { start: now - 1000 * 60 * 60 * 24 * 7, end: now };
    default: return null;
  }
};

const updateUrl = (opts?: { replace?: boolean }) => {
  const next: Record<string, any> = { ...route.query };
  const range = computeRangeForKey(selectedDateRangeKey.value);
  if (range) next.date = `${range.start}-${range.end}`; else delete next.date;
  const method = opts?.replace ? router.replace : router.push;
  method({ query: next }).catch(() => {});
};

watch(selectedDateRangeKey, () => updateUrl({ replace: true }));
// when date range changes, clear state and fetch fresh only when service id available
watch(selectedDateRangeKey, () => {
  nextToken.value = undefined;
  allLogEvents.value = [];
  seenEventKeys.value = new Set();
  if (service.value?.id) execute();
});

const { data, pending, error, execute } = useAsyncData(
  `runtime-logs-${service.value?.id}`,
  async () => {
    const range = computeRangeForKey(selectedDateRangeKey.value);
    const params: any = { service_id: service.value?.id as string, nextToken: nextToken.value };
    if (range) {
      params.startTime = range.start;
      params.endTime = range.end;
    }
    return $client.services.getRuntimeLogs.query(params);
  },
  {
    server: false,
    immediate: false,
    default: () => ({ events: [], nextForwardToken: undefined }),
  }
);

// Execute only when we have a service id (avoid SSR or undefined service_id errors)
watch(service, (s) => {
  if (s?.id) {
    // reset and fetch fresh when service changes
    nextToken.value = undefined;
    allLogEvents.value = [];
    seenEventKeys.value = new Set();
    execute();
  }
}, { immediate: true });

watch(data, (newData) => {
  if (newData) {
    // push deduped
    for (const ev of newData.events || []) {
      const key = `${ev.timestamp}-${ev.message}`;
      if (!seenEventKeys.value.has(key)) {
        seenEventKeys.value.add(key);
        allLogEvents.value.push(ev);
      }
    }
    nextToken.value = newData.nextForwardToken;
  }
});

const handleRequestMore = async () => {
  try {
    await execute();
  } catch (err) {
    console.error('Error loading more logs:', err);
  }
};

const refreshNow = async () => {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    if (nextToken.value) {
      await execute();
    } else {
      nextToken.value = undefined;
      allLogEvents.value = [];
      await execute();
    }
  } catch (err) {
    console.error('Error refreshing logs:', err);
  } finally {
    refreshing.value = false;
  }
};

const toggleLive = () => {
  live.value = !live.value;
  if (live.value) {
    pollingInterval.value = setInterval(async () => {
      await execute();
    }, 10000);
  } else {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
  }
};

const isPollingActive = computed(() => {
  return live.value && !!pollingInterval.value;
});

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});
</script>