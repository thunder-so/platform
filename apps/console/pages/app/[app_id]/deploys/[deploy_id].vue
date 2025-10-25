<template>
  <ClientOnly>
    <UCard v-if="deployPending">
      <template #header>
        <USkeleton class="h-6 w-40" />
      </template>
      <div class="flex flex-col gap-4">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-6 w-full" />
        </div>
      </div>
    </UCard>
    <UCard v-if="deployData">
    <template #header>
      <div class="flex justify-between items-center">
        <h3>Deploy Details</h3>
        <UButton v-if="deepLink" :to="deepLink" target="_blank" external color="neutral" variant="outline">
          View in CloudWatch
        </UButton>
      </div>
    </template>

    <div class="flex items-top gap-4">
      <Icon 
        :name="getStatusIcon(deployData.pipeline_state)" 
        :class="getStatusIconClass(deployData.pipeline_state)"
        size="24"
        class="mt-2"
      />
      <div class="flex-1 ml-3">
        <div class="grid grid-cols-3 gap-2 w-full mb-4">
          <div class="flex flex-col text-left">
            <h4>Status</h4>
            <p class="text-sm text-muted">{{ deployData.pipeline_state || 'NULL' }}</p>
          </div>

          <div class="flex flex-col col-span-2 text-left">
            <h4>Deploy ID</h4>
            <p class="text-sm text-muted">{{ deployData.pipeline_execution_id }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 w-full mb-4">
          <div class="flex flex-col text-left">
            <h4>Created</h4>
            <p class="text-sm text-muted">{{ formatDate(deployData.pipeline_start) }}</p>
          </div>

          <div class="flex flex-col text-left">
            <h4>Finished</h4>
            <p class="text-sm text-muted">{{ deployData.pipeline_end ? formatDate(deployData.pipeline_end) : '-' }}</p>
          </div>

          <div class="flex flex-col text-left">
            <h4>Duration</h4>
            <p class="text-sm text-muted">{{ duration }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 w-full">
          <div class="flex flex-col col-span-3 text-left">
            <h4>Source</h4>
            <div class="flex flex-col">
              <div class="flex flex-row gap-4 mt-1">
                <div class="leading-none">
                  <NuxtLink 
                    :to="deployData.pipeline_metadata?.entityUrl" 
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
                    :to="deployData.pipeline_metadata?.revisionUrl" 
                    target="_blank" 
                    class="inline-flex text-muted hover:text-white transition-colors"
                  >
                    <span class="flex items-center gap-1">
                      <Icon name="fa6-solid:code-commit" class="w-4 h-4" />
                      <span class="text-sm">{{ deployData.pipeline_metadata?.revisionId?.substring(0, 7) }}</span>
                    </span>
                  </NuxtLink>
                </div>
                <div class="leading-none">
                  <span class="text-sm">{{ deployData.pipeline_metadata?.revisionSummary }}</span>
                </div>
              </div>
          </div>
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
          :loading="isLoading"
        />
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApplications } from '~/composables/useApplications';

definePageMeta({
  layout: 'app',
});

const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const { applicationSchema } = useApplications();
const route = useRoute();
const deployId = computed(() => route.params.deploy_id as string);

const nextToken = ref<string | undefined>(undefined);
const deployData = ref<any>(null);
const allLogEvents = ref<any[]>([]);
const deepLink = ref<string | undefined>(undefined);
const error = ref<any>(null);
const realtimeChannel = ref<any>(null);
const live = ref(false);
const refreshing = ref(false);
const pollingInterval = ref<NodeJS.Timeout | null>(null);
const currentTime = ref(Date.now());

const environment = computed(() => applicationSchema.value?.environments?.[0]);
const service = computed(() => environment.value?.services?.[0]);

// Fetch deploy data using Supabase
const { data: deploy, pending: deployPending } = useAsyncData(`deploy-${deployId.value}`,
  async () => {
    const { data, error: sbError } = await supabase
      .from('events')
      .select('*, environments(*, providers(*))')
      .eq('pipeline_execution_id', deployId.value)
      .maybeSingle();
    if (sbError) throw sbError;
    return data;
  },
  { server: false }
);

// Fetch deploy logs
const { data, pending, error: logsError, execute } = useAsyncData(`deploy-logs-${deployId.value}`,
  async () => {
    if (!deployData.value?.pipeline_log || !deployData.value?.environments?.providers) return { events: [], nextForwardToken: undefined };
    return $client.services.getDeployLogs.query({
      pipeline_log: deployData.value.pipeline_log,
      provider: deployData.value.environments.providers,
      nextToken: nextToken.value,
    });
  },
  {
    server: false,
    default: () => ({ events: [], nextForwardToken: undefined }),
    immediate: false
  }
);

watch(deploy, (newDeploy) => {
  if (newDeploy) {
    deployData.value = newDeploy;
    if (newDeploy.pipeline_log?.['deep-link']) {
      deepLink.value = newDeploy.pipeline_log['deep-link'];
    }
    nextTick(() => {
      if (newDeploy.pipeline_log && newDeploy.environments?.providers) {
        execute();
      }
    });
  }
});

onMounted(() => {
  if (deployData.value) {
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

watch(deployData, (newData) => {
  if (newData && !realtimeChannel.value) {
    setupRealtimeSubscription();
  }
});

const setupRealtimeSubscription = () => {
  if (process.server || realtimeChannel.value) return;
  
  realtimeChannel.value = supabase
    .channel(`events`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'events',
      filter: `pipeline_execution_id=eq.${deployId.value}`
    }, (payload) => {
      deployData.value = { ...deployData.value, ...payload.new };
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

watch(logsError, (newErr) => {
  if (newErr) {
    console.error('Error fetching deploy logs:', newErr);
    error.value = newErr;
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
  return deployPending.value || (pending.value && allLogEvents.value.length === 0);
});

// Helper functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const duration = computed(() => {
  if (!deployData.value?.pipeline_start) return null;
  
  const start = new Date(deployData.value.pipeline_start);
  const end = deployData.value.pipeline_end ? new Date(deployData.value.pipeline_end) : currentTime.value;
  const diff = end - start.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
});

const getStatusIcon = (status?: string | null) => {
  const normalizedStatus = (status || '').toString().toUpperCase();
  
  if (['STARTED', 'RESUMED'].includes(normalizedStatus)) {
    return 'line-md:loading-loop';
  }
  if (['FAILED', 'CANCELED'].includes(normalizedStatus)) {
    return 'material-symbols:warning-outline-rounded';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'material-symbols:bookmark-check';
  }
  return 'ix:about';
};

const getStatusIconClass = (status?: string | null) => {
  const normalizedStatus = (status || '').toString().toUpperCase();
  
  if (['STARTED', 'RESUMED'].includes(normalizedStatus)) {
    return 'text-yellow-500';
  }
  if (['FAILED', 'CANCELED'].includes(normalizedStatus)) {
    return 'text-error';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'text-success';
  }
  return 'text-gray-500';
};

</script>
