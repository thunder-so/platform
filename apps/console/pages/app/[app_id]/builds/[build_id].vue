<template>
  <div class="p-4 h-full">
    <h1 class="text-2xl font-bold mb-4">
      Build Details
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
import { ref, computed } from 'vue';

definePageMeta({
  layout: 'app',
});

const { $client } = useNuxtApp();
const route = useRoute();
const buildId = computed(() => route.params.build_id as string);
const nextToken = ref<string | undefined>(undefined);
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
    immediate: true,
  }
);

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
  // This logic determines if polling should continue.
  // For example, you might stop polling if the build is complete.
  // This requires getting the build status.
  return !!nextToken.value;
});

</script>
