<template>
  <div>
    <h1>Deployment Details</h1>
    <p>Details for deployment {{ $route.params.deploy_id }} in application {{ $route.params.app_id }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
