<template>
  <div>
    <div v-if="linkExpired" class="text-center p-4">
      <p class="text-red-500 text-lg">Your login link has expired or is invalid.</p>
      <p class="mt-2">Please authenticate again.</p>
      <UButton to="/login" class="mt-4">Go to Login</UButton>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <div class="flex flex-col items-center mb-6">
            <div class="flex space-between mb-1">
                <!-- <Brand class="w-6 mr-2" /> -->
                <h3>thunder</h3>
            </div>
        </div>
        <div class="w-full rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0 card border-border">
            <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                <ClientOnly>
                <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <div class="flex justify-content-center">
                        <!-- <ProgressSpinner style="width: 32px; height: 32px" strokeWidth="3"
                            animationDuration="1s" aria-label="progess" /> -->
                    </div>
                    <div class="text-center">
                        logging you in ...
                    </div>
                </div>
                </ClientOnly>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

// The magic link has expired
const linkExpired = ref(false)

const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove '#'
if (hashParams.get('error_code') === 'otp_expired') {
  linkExpired.value = true
}

// Watch for new user
watch(user, async (newUser) => {
  if (newUser) {
    // If the user was invited to an organization
    const organizationId = route.query.organization_id

    if (organizationId) {
      navigateTo({
        path: `/invite?organization_id=${organizationId}`,
        replace: true
      }) 
    }

    // Standard login/signup, send to dashboard
    navigateTo({
        path: '/',
        replace: true
    }) 
  } 
}, { immediate: true })
</script>