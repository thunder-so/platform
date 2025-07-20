<template>
  <div>
    <h1>Environment Settings</h1>
    <p>Settings for environment {{ $route.params.env_id }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});
</script>
