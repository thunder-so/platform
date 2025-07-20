<template>
  <div>
    <h1>Environment Headers</h1>
    <p>Header settings for environment {{ $route.params.env_id }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
