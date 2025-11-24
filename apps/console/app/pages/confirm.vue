<template>
  <div>
    <ClientOnly>
    <div v-if="error" class="text-center p-4">
      <UAlert color="error" variant="soft" :title="error.message" />
      <p>
        <UButton to="/login" class="mt-4">Go to Login</UButton>
      </p>
    </div>
    <div v-else class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-sm text-muted">Logging you in...</div>
      </div>
    </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const redirectInfo = useSupabaseCookieRedirect();
const { selectedOrganization, initializeSession } = useMemberships()
const { $client } = useNuxtApp();
const error = ref<{ message: string } | null>(null);

const setupAndRedirect = async () => {
  await initializeSession();
  
  // If no organization is selected after initialization, wait and retry
  if (!selectedOrganization.value) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await initializeSession();
  }
  
  // Get redirect path from cookie and clear it
  const redirectPath = redirectInfo.pluck();
  
  navigateTo({ 
    path: redirectPath || `/org/${selectedOrganization.value?.id}`, 
    replace: true 
  });
}

onMounted(async () => {
  try {
    // Parse query and hash parameters
    const queryParams = route.query;
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    // Check for error in hash
    const errorCode = hashParams.get('error_code');
    if (errorCode) {
      throw new Error('Your login link has expired or is invalid.');
    }

    // Handle PKCE flow (normal magic link and GitHub)
    const code = queryParams.code;
    if (code) {
      watch(user, async (newUser) => {
        if (newUser?.sub) {
          // Check for checkout_id to assign seat
          const checkoutId = queryParams.checkout_id as string | undefined;
          if (checkoutId) {
            try {
              await $client.organizations.verifyCheckout.query({ checkoutId });
              // Force a fresh membership refresh after checkout verification
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
              console.error('Checkout verification failed:', err);
            }
          }
          setupAndRedirect();
        } 
      }, { immediate: true })
    }

  } catch (err: any) {
    console.error('Authentication error:', err);
    error.value = err?.message || 'An error occurred during authentication.';
  }
});
</script>