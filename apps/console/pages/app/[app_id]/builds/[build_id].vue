<template>
  <UCard>
    <template #header>
      <h3>Build logs</h3>
    </template>

    <div class="flex justify-between items-start">
      <div v-if="buildData" class="text-md space-y-1">
        <div class="flex gap-4">
          <span><strong>Status:</strong> 
            <UBadge :color="getStatusColor(buildData.build_status)" variant="subtle">
              {{ buildData.build_status || 'NULL' }}
            </UBadge>
          </span>
        </div>
        <div class="flex gap-4">
          <span v-if="buildData.build_start"><strong>Start:</strong> {{ formatDate(buildData.build_start) }}</span>
          <span v-if="buildData.build_end"><strong>End:</strong> {{ formatDate(buildData.build_end) }}</span>
          <span v-if="duration"><strong>Duration:</strong> {{ duration }}</span>
        </div>
      </div>
    </div>
  </UCard>

  <div class="mt-4 h-full">
    <div class="h-[calc(100vh-10rem)]">
      <AppLogViewer 
        :log-events="allLogEvents" 
        :deep-link="deepLink" 
        :loading="pending && allLogEvents.length === 0"
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
const route = useRoute();
const buildId = computed(() => route.params.build_id as string);

const nextToken = ref<string | undefined>(undefined);
const buildData = ref<any>(null);
const allLogEvents = ref<any[]>([]);
const deepLink = ref<string | undefined>(undefined);

const { data, pending, error, execute } = useAsyncData(`build-logs-${buildId.value}`,
  () => {
    return $client.services.getBuildLogs.query({
      build_id: buildId.value,
      nextToken: nextToken.value,
    });
  },
  {
    server: false,
  }
);

onMounted(() => {
  execute();
});

watch(data, (newData) => {
  if (newData) {
    allLogEvents.value.push(...newData.events);
    nextToken.value = newData.nextForwardToken;
    if (!deepLink.value) {
      deepLink.value = newData.deepLink;
    }
    if (newData.build && !buildData.value) {
      buildData.value = newData.build;
    }
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

const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'SUCCEEDED': return 'green';
    case 'FAILED': return 'red';
    case 'IN_PROGRESS': return 'blue';
    case 'TIMED_OUT': return 'orange';
    case 'STOPPED': return 'gray';
    case 'FAULT': return 'red';
    default: return 'gray';
  }
};

</script>
