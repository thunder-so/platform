<template>
  <div>
    <h1>Environment Domains</h1>
    <p>Domain settings for environment {{ $route.params.env_id }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
