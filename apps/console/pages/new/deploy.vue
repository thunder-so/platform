<template>
  <div>
    <h1>Deploying Application</h1>
    <DeploymentProgress />
  </div>
</template>

<script setup lang="ts">
import DeploymentProgress from '~/components/application/DeploymentProgress.vue';

definePageMeta({
  layout: 'new'
});
</script>