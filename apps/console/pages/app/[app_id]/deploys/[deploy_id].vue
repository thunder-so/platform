<template>
  <div class="p-4 h-full">
    <h1 class="text-2xl font-bold mb-4">
      Deploy Details
    </h1>
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

</script>
