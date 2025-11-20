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
  watch(user, (newUser, oldUser) => {
    if (newUser && !oldUser) {
      $posthog().identify(newUser.id, {
        email: newUser.email,
        name: newUser.user_metadata?.name || newUser.user_metadata?.full_name,
        created_at: newUser.created_at,
      })
      $posthog().capture('user_logged_in')
    } else if (!newUser && oldUser) {
      $posthog().capture('user_logged_out')
      $posthog().reset()
    }
  }, { immediate: true })
})