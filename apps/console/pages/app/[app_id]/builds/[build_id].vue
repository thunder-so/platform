<template>
  <UCard v-if="buildPending">
    <template #header>
      <USkeleton class="h-6 w-40" />
    </template>
    <USkeleton class="h-6 w-full" />
    <USkeleton class="h-6 w-full" />
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
            <p class="text-sm text-muted">{{ formatDate(buildData.build_start) }}</p>
          </div>

          <div class="flex flex-col text-left">
            <h4>Finished</h4>
            <p class="text-sm text-muted">{{ formatDate(buildData.build_end) }}</p>
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
    <UAlert v-if="error" color="warning" variant="subtle" class="mb-4" :title="error.message" />

    <div class="h-[calc(100vh-10rem)]">
      <AppLogViewer 
        :log-events="allLogEvents" 
        :deep-link="deepLink" 
        :loading="isLoading"
        :polling="isPollingActive"
        @request-more="handleRequestMore"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

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

const isPollingActive = computed(() => {
  return !!nextToken.value;
});

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
  const end = buildData.value.build_end ? new Date(buildData.value.build_end) : new Date();
  const diff = end.getTime() - start.getTime();
  
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
    return 'material-symbols:warning-outline-rounded';
  }
  if (normalizedStatus === 'SUCCEEDED') {
    return 'material-symbols:bookmark-check';
  }
  return 'ix:about';
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
