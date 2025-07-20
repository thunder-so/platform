<template>
  <div>
    <h1>Environment Overview</h1>
    <p>Overview for environment {{ $route.params.env_id }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
