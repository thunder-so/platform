<template>
  <div>
    <h3>Static Application Configuration</h3>
    <label for="static-root-dir">Root Directory:</label>
    <input type="text" id="static-root-dir" v-model="config.rootDir" />
    <label for="static-output-dir">Output Directory:</label>
    <input type="text" id="static-output-dir" v-model="config.outputDir" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const config = ref({
  rootDir: '',
  outputDir: '',
});

const emit = defineEmits(['update:config']);

watch(config.value, (newConfig) => {
  emit('update:config', newConfig);
}, { deep: true });
</script>

<style scoped></style>