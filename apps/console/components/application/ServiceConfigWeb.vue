<template>
  <div>
    <h3>Web Application Configuration</h3>
    <label for="web-port">Port:</label>
    <input type="number" id="web-port" v-model="config.port" />
    <label for="web-build-command">Build Command:</label>
    <input type="text" id="web-build-command" v-model="config.buildCommand" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const config = ref({
  port: 3000,
  buildCommand: '',
});

const emit = defineEmits(['update:config']);

watch(config.value, (newConfig) => {
  emit('update:config', newConfig);
}, { deep: true });
</script>

<style scoped></style>