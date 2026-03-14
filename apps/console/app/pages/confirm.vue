<template>
  <div>
    <ClientOnly>
      <div v-if="error" class="flex items-center justify-center min-h-[400px]">
        <UCard class="max-w-md">
          <template #header>
            <div class="flex items-center gap-2">
              <Icon name="tabler:shield-x" class="text-error" size="20" />
              <h3>Access Denied</h3>
            </div>
          </template>
          
          <div class="space-y-4">
            <p class="text-muted">{{ error.message }}</p>

            <UButton to="/login" class="mt-4">Go back to Login</UButton>
          </div>
        </UCard>
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
  
  // Only redirect to org if we have a selected organization
  if (selectedOrganization.value?.id) {
    navigateTo({ 
      path: redirectPath || `/org/${selectedOrganization.value.id}`, 
      replace: true 
    });
  }
}

onMounted(async () => {
  try {
    // Parse query and hash parameters
    const queryParams = route.query;
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    // Check for error in hash or query
    const errorCode = hashParams.get('error_code') || queryParams.error_code;
    const errorType = hashParams.get('error') || queryParams.error;
    const errorDescription = hashParams.get('error_description') || queryParams.error_description;

    if (errorType === 'access_denied') {
      throw new Error(errorDescription as string || 'Access to your GitHub account was denied. This is required to login.');
    }

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
    error.value = { message: err?.message || 'An error occurred during authentication.' };
  }
});
</script>