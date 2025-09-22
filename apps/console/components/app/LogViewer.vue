<template>
  <div class="text-white font-mono rounded-md h-full flex flex-col">
    <!-- <div class="flex-shrink-0 p-2 bg-gray-800 flex justify-between items-center">
      <span class="text-sm">CloudWatch Logs</span>
      <UButton v-if="deepLink" :to="deepLink" target="_blank" size="xs" color="gray">View in AWS Console</UButton>
    </div> -->
    <div ref="logsContainer" class="p-4 overflow-y-auto flex-grow">
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

const props = defineProps({
  logEvents: {
    type: Array,
    default: () => [],
  },
  deepLink: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  polling: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['request-more']);

const logsContainer = ref<HTMLElement | null>(null);
let pollInterval: any = null;

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
  if (props.polling) {
    pollInterval = setInterval(() => {
      emit('request-more');
    }, 5000);
  }
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});

</script>
