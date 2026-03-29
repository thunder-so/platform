<template>
  <div class="text-highlighted font-mono rounded-md h-full flex flex-col">
    <div ref="logsContainer" class="border border-muted rounded p-4 overflow-y-auto flex-grow">
      <div v-if="loading && logEvents.length === 0" class="flex items-center justify-center h-full">
        <p>Loading logs...</p>
      </div>
      <div v-else-if="logEvents.length > 0">
        <div v-for="(event, index) in logEvents" :key="index" class="flex">
          <span class="text-gray-500 mr-4">{{ new Date(event.timestamp).toLocaleTimeString() }}</span>
          <span>{{ event.message }}</span>
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full">
        <p>No log data available.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

type LogEvent = { timestamp: number | string; message: string };

const props = defineProps({
  logEvents: {
    type: Array as () => LogEvent[],
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const logsContainer = ref<HTMLElement | null>(null);

const scrollToBottom = () => {
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
  }
};

watch(() => props.logEvents, () => {
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  scrollToBottom();
});

</script>
