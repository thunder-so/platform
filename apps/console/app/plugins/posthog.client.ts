export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const { $posthog } = useNuxtApp()
  const router = useRouter()
  const cookieConsent = useCookieConsent()

  // Initialize PostHog capture state based on current analytics consent
  const initializePostHogConsentState = () => {
    const hasAnalyticsConsent = cookieConsent.preferences.value?.analytics === true
    if (!hasAnalyticsConsent) {
      $posthog().opt_out_capturing()
    } else {
      $posthog().opt_in_capturing()
    }
  }

  // Set initial consent state
  initializePostHogConsentState()

  // Listen for analytics consent changes
  watch(() => cookieConsent.preferences.value?.analytics, (hasConsent) => {
    if (hasConsent) {
      $posthog().opt_in_capturing()
    } else {
      $posthog().opt_out_capturing()
    }
  })

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
      $posthog().identify(newUser.sub, {
        email: newUser.email,
        name: newUser.user_metadata?.name || newUser.user_metadata?.full_name,
      })
      $posthog().capture('user_logged_in')
    } else if (!newUser && oldUser && isInitialized) {
      $posthog().capture('user_logged_out')
      $posthog().reset()
    } else if (newUser && !isInitialized) {
      // Initial page load with authenticated user - identify without login event
      $posthog().identify(newUser.sub, {
        email: newUser.email,
        name: newUser.user_metadata?.name || newUser.user_metadata?.full_name,
      })
    }
    isInitialized = true
  }, { immediate: true })
})