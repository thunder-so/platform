<template>
  <div>
    <div v-if="error" class="text-center p-4">
      <p class="text-red-500 text-lg">{{ error }}</p>
      <UButton to="/login" class="mt-4">Go to Login</UButton>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
      <div class="w-full rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0 card border-border">
        <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
          <ClientOnly>
            <div class="text-center">Logging you in...</div>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const { selectedOrganization, initializeSession } = useMemberships()
const error = ref(null);

const setupAndRedirect = async () => {
  await initializeSession();
  // console.log('confirm selectedOrganization', selectedOrganization.value)
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

    // Handle implicit flow (invite links)
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    if (accessToken && refreshToken && type === 'magiclink') {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;

      // Redirect based on organization_id
      const organizationId = queryParams.organization_id;
      if (organizationId && data.user.email) {
        navigateTo({
          path: '/invite',
          query: {
            organization_id: organizationId,
          },
          // replace: true
        });
      }
    }

    // Handle PKCE flow (normal magic link and GitHub)
    const code = queryParams.code;
    if (code) {
      watch(user, (newUser) => {
        if (newUser) {
          setupAndRedirect();
        } 
      }, { immediate: true })
    }

  } catch (err) {
    console.error('Authentication error:', err);
    error.value = err.message || 'An error occurred during authentication.';
  }
});
</script>