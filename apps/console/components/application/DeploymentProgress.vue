<template>
  <div>
    <h2>Deployment Progress</h2>
    <p>Current Status: {{ deploymentStatus }}</p>
    <!-- TODO: Add more detailed progress, logs, etc. -->
  </div>
</template>

<script setup lang="ts">
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

const { deploymentStatus } = useNewApplicationFlow();
</script>

<style scoped></style>