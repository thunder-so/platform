<script setup lang="ts">
const route = useRoute();
const title: any = ref(route.meta.title || 'console.thunder.so');
const { memberships, isLoading, refreshMemberships } = useMemberships()

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
})

watch(
  () => route.meta.title,
  (newTitle) => {
    title.value = newTitle;
  }
)

onMounted(async () => {
  refreshMemberships()
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator 
    :throttle="0"
    :height="2" 
    color="repeating-linear-gradient(to right,yellow 0%,red 50%,blue 100%)" 
  />
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
