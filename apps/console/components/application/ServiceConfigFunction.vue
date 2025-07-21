<template>
  <div>
    <h3>Function Application Configuration</h3>
    <label for="function-runtime">Runtime:</label>
    <input type="text" id="function-runtime" v-model="config.runtime" />
    <label for="function-memory">Memory (MB):</label>
    <input type="number" id="function-memory" v-model="config.memory" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const config = ref({
  runtime: '',
  memory: 128,
});

const emit = defineEmits(['update:config']);

watch(config.value, (newConfig) => {
  emit('update:config', newConfig);
}, { deep: true });
</script>

<style scoped></style>