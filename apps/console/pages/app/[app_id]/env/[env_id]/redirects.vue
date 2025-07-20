<template>
  <div>
    <h1>Environment Redirects</h1>
    <p>Redirect settings for environment {{ $route.params.env_id }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
