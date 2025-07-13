<script setup lang="ts">
const route = useRoute();
const title: any = ref(route.meta.title || 'console.thunder.so');

useHead({
  title: title,
  meta: [
    { 
      name: 'viewport', 
      content: 'width=device-width, initial-scale=1',
    },
  ],
  link: [
    { 
      rel: 'icon',
      type: 'image/svg+xml',
      // href: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>" 
      href: "https://thunder.so/images/thunder.svg" 
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter&display=swap',
      crossorigin: ''    
    } 
  ]
});

watch(
  () => route.meta.title,
  (newTitle) => {
    title.value = newTitle;
  }
);
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator 
    :throttle="0"
    :height="2" 
    color="repeating-linear-gradient(to right,yellow 0%,red 50%,blue 100%)" 
  />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
