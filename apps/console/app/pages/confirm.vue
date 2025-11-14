<template>
  <div>
    <div v-if="error" class="text-center p-4">
      <UAlert color="error" variant="soft" :title="error.message" />
      <p>
        <UButton to="/login" class="mt-4">Go to Login</UButton>
      </p>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
      <UCard>
        <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
          <ClientOnly>
            <div class="text-center">Logging you in...</div>
          </ClientOnly>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const { selectedOrganization, initializeSession } = useMemberships()
const { $client } = useNuxtApp();
const error = ref<{ message: string } | null>(null);

const setupAndRedirect = async () => {
  await initializeSession();
  navigateTo({ 
    path: `/org/${selectedOrganization.value?.id}`, 
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
        if (newUser) {
          // Check for checkout_id to assign seat
          const checkoutId = queryParams.checkout_id as string | undefined;
          if (checkoutId) {
            try {
              await $client.organizations.verifyCheckout.query({ checkoutId });
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