export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const { $posthog } = useNuxtApp()
  const router = useRouter()

  // Track page views
  router.afterEach((to) => {
    $posthog().capture('$pageview', {
      $current_url: to.fullPath,
      page_title: to.meta.title || to.name
    })
  })

  // Track user authentication
  let isInitialized = false
  watch(user, (newUser, oldUser) => {
    if (newUser && !oldUser && isInitialized) {
      $posthog().identify(newUser.id, {
        email: newUser.email,
        name: newUser.user_metadata?.name || newUser.user_metadata?.full_name,
        created_at: newUser.created_at,
      })
      $posthog().capture('user_logged_in')
    } else if (!newUser && oldUser && isInitialized) {
      $posthog().capture('user_logged_out')
      $posthog().reset()
    } else if (newUser && !isInitialized) {
      // Initial page load with authenticated user - identify without login event
      $posthog().identify(newUser.id, {
        email: newUser.email,
        name: newUser.user_metadata?.name || newUser.user_metadata?.full_name,
        created_at: newUser.created_at,
      })
    }
    isInitialized = true
  }, { immediate: true })
})