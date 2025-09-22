<template>
  <UCard>
    <template #header>
      <h3>Deploy logs</h3>
    </template>

    <div class="flex justify-between items-start">
      <div v-if="deployData" class="text-md space-y-1">
        <div class="flex gap-4">
          <span><strong>Status:</strong> 
            <UBadge :color="getStatusColor(deployData.pipeline_state)" variant="subtle">
              {{ deployData.pipeline_state || 'NULL' }}
            </UBadge>
          </span>
        </div>
        <div class="flex gap-4">
          <span v-if="deployData.pipeline_start"><strong>Start:</strong> {{ formatDate(deployData.pipeline_start) }}</span>
          <span v-if="deployData.pipeline_end"><strong>End:</strong> {{ formatDate(deployData.pipeline_end) }}</span>
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
const deployId = computed(() => route.params.deploy_id as string);

const nextToken = ref<string | undefined>(undefined);
const deployData = ref<any>(null);
const allLogEvents = ref<any[]>([]);
const deepLink = ref<string | undefined>(undefined);

const { data, pending, error, execute } = useAsyncData(`deploy-logs-${deployId.value}`,
  () => {
    return $client.services.getDeployLogs.query({
      deploy_id: deployId.value,
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
    if (newData.deploy && !deployData.value) {
      deployData.value = newData.deploy;
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
  if (!deployData.value?.pipeline_start) return null;
  
  const start = new Date(deployData.value.pipeline_start);
  const end = deployData.value.pipeline_end ? new Date(deployData.value.pipeline_end) : new Date();
  const diff = end.getTime() - start.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
});

const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'SUCCEEDED': return 'green';
    case 'FAILED': return 'red';
    case 'STARTED': return 'blue';
    case 'RESUMED': return 'blue';
    case 'CANCELED': return 'orange';
    case 'SUPERSEDED': return 'gray';
    default: return 'gray';
  }
};

</script>
