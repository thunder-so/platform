<template>
  <div v-if="showBanner"
    class="fixed bottom-4 right-4 z-50"
  >
    <UCard
      variant="soft"
    >
      <h2>
        We use cookies 🍪
      </h2>

      <p class="text-sm text-muted mt-2">
        To personalize content and analyze traffic. <br />You can customize your preferences.
      </p>

      <div class="flex justify-between mt-4">
        <div class="flex gap-2">
          <UButton @click="handleAccept">
            Accept All
          </UButton>

          <UButton
            color="neutral"
            variant="ghost"
            @click="handleDeny"
          >
            Deny
          </UButton>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          @click="handleOpenModal"
        >
          Customize
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const {
  acceptAll,
  denyAll,
  hasUserMadeChoice,
  isConsentExpired,
  onConsentAccepted,
  onConsentDenied,
  onCategoryAccepted,
  onScriptsInjected,
  onScriptsRemoved,
} = useCookieConsent()

onConsentAccepted(() => {
  console.log('[HOOK] Consent accepted')
})

onConsentDenied(() => {
  console.log('[HOOK] Consent denied')
})

onCategoryAccepted((category) => {
  console.log('[HOOK] Category accepted:', category)
})

onScriptsInjected((category) => {
  console.log('[HOOK] Scripts injected for category:', category)
})

onScriptsRemoved((category) => {
  console.log('[HOOK] Scripts removed for category:', category)
})

const showBanner = ref(!hasUserMadeChoice.value || isConsentExpired.value)
watch([hasUserMadeChoice, isConsentExpired], () => {
  showBanner.value = !hasUserMadeChoice.value || isConsentExpired.value
})

const emit = defineEmits(['open-modal'])

function handleOpenModal() {
  emit('open-modal')
}

function handleAccept() {
  acceptAll()
  showBanner.value = false
}

function handleDeny() {
  denyAll()
  showBanner.value = false
}
</script>