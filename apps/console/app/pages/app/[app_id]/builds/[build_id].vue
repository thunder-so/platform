<template>
  <ClientOnly>
    <UCard v-if="buildPending">
      <template #header>
        <USkeleton class="h-6 w-40" />
      </template>
      <div class="flex flex-col gap-4">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-6 w-full" />
        </div>
      </div>
    </UCard>
    <UCard v-if="buildData">
    <template #header>
      <h3>Build Details</h3>
    </template>

    <div class="flex items-top gap-4">
      <Icon 
        :name="getStatusIcon(buildData.build_status)" 
        :class="getStatusIconClass(buildData.build_status)"
        size="24"
        class="mt-2"
      />
      <div class="flex-1 ml-3">
        <div class="grid grid-cols-3 gap-2 w-full mb-4">
          <div class="flex flex-col text-left">
            <h4>Status</h4>
            <p class="text-sm text-muted">{{ buildData.build_status || 'NULL' }}</p>
          </div>

          <div class="flex flex-col col-span-2 text-left">
            <h4>Build ID</h4>
            <p class="text-sm text-muted">{{ buildData.id }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 w-full">
          <div class="flex flex-col text-left">
            <h4>Created</h4>
            <p class="text-sm text-muted">{{ buildData.build_start ? formatDate(buildData.build_start) : formatDate(buildData.created_at) }}</p>
          </div>

          <div class="flex flex-col text-left">
            <h4>Finished</h4>
            <p class="text-sm text-muted">{{ buildData.build_end ? formatDate(buildData.build_end) : '-' }}</p>
          </div>

          <div class="flex flex-col text-left">
            <h4>Duration</h4>
            <p class="text-sm text-muted">{{ duration }}</p>
          </div>
        </div>
      </div>
    </div>
    </UCard>

    <div class="mt-4 h-full">
      <div class="flex items-center gap-2 mb-4">
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
            icon="tabler:rotate"
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
          :loading="isLoading"
        />
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

definePageMeta({
  layout: 'app',
});

const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const route = useRoute();
const buildId = computed(() => route.params.build_id as string);

const nextToken = ref<string | undefined>(undefined);
const buildData = ref<any>(null);
const allLogEvents = ref<any[]>([]);
const deepLink = ref<string | undefined>(undefined);
const realtimeChannel = ref<any>(null);
const live = ref(false);
const refreshing = ref(false);
const pollingInterval = ref<NodeJS.Timeout | null>(null);
const currentTime = ref(Date.now());

// Fetch build data using Supabase
const { data: build, pending: buildPending } = useAsyncData(`build-${buildId.value}`,
  async () => {
    const { data, error } = await supabase
      .from('builds')
      .select('*')
      .eq('id', buildId.value)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  { server: false }
);

// Fetch build logs 
const { data, pending, error, execute } = useAsyncData(`build-logs-${buildId.value}`,
  async () => {
    if (!buildData.value?.build_log) return { events: [], nextForwardToken: undefined };
    return $client.services.getBuildLogs.query({
      build_log: buildData.value.build_log,
      nextToken: nextToken.value,
    });
  },
  {
    server: false,
    default: () => ({ events: [], nextForwardToken: undefined }),
    immediate: false,
  }
);

watch(build, (newBuild) => {
  if (newBuild) {
    buildData.value = newBuild;
    if (newBuild.build_log) {
      execute();
    }
  }
});

onMounted(() => {
  if (buildData.value) {
    setupRealtimeSubscription();
  }
  
  // Update current time every second for ticking duration
  const timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
  
  onUnmounted(() => {
    clearInterval(timeInterval);
  });
});

watch(buildData, (newData) => {
  if (newData && !realtimeChannel.value) {
    setupRealtimeSubscription();
  }
});

const setupRealtimeSubscription = () => {
  if (process.server || realtimeChannel.value) return;
  
  realtimeChannel.value = supabase
    .channel(`builds`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'builds',
      filter: `id=eq.${buildId.value}`
    }, (payload) => {
      buildData.value = { ...buildData.value, ...payload.new };
    })
    .subscribe();
};

onUnmounted(() => {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value);
  }
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});

watch(data, (newData) => {
  if (newData) {
    allLogEvents.value.push(...newData.events);
    nextToken.value = newData.nextForwardToken;
  }
});

watch(error, (newError) => {
  if (newError) {
    console.error('Error fetching logs:', newError);
  }
});

const handleRequestMore = () => {
  if (nextToken.value) {
    execute();
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
      if (nextToken.value) {
        refreshing.value = true;
        await execute();
        refreshing.value = false;
      }
    }, 10000);
  } else {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
  }
};



const isLoading = computed(() => {
  return buildPending.value || (pending.value && allLogEvents.value.length === 0);
});

// Helper functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const duration = computed(() => {
  if (!buildData.value?.build_start) return null;
  
  const start = new Date(buildData.value.build_start);
  const end = buildData.value.build_end ? new Date(buildData.value.build_end) : currentTime.value;
  const diff = end - start.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
});

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
</script>
