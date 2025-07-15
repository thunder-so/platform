<template>
  <div>
    <h1>Application: {{ $route.params.app_id }} Settings</h1>
    <p>This page will contain settings for the application.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
