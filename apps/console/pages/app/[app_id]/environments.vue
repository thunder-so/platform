<template>
  <div>
    <h1>Application: {{ $route.params.app_id }} Environments</h1>
    <p>This page will list environments for the application.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
