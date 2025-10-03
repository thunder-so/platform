<template>
  <div class="h-[calc(100vh-10rem)]">
    <AppLogViewer 
      :log-events="allLogEvents" 
      :deep-link="deepLink" 
      :loading="pending && allLogEvents.length === 0"
      :polling="isPollingActive"
      @request-more="handleRequestMore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

definePageMeta({
  layout: 'app',
});

const { $client } = useNuxtApp();
const route = useRoute();
const { 
  currentService: service,
} = useApplications();

const nextToken = ref<string | undefined>(undefined);
const allLogEvents = ref<any[]>([]);
const deepLink = ref<string | undefined>(undefined);

const { data, pending, error, execute } = useAsyncData(`runtime-logs-${service.value?.id}`,
  () => {
    return $client.services.getRuntimeLogs.query({
      service_id: service.value?.id as string,
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