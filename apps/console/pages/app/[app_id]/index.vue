<template>
  <div>
    <h1>Application: {{ $route.params.app_id }} Overview</h1>
    <p>This is the overview page for the application.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
