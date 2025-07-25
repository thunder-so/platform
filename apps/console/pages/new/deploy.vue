<template>
  <div>
    <UCard>
      <template #header>
        <h1>Deploy Application</h1>
      </template>

      <ClientOnly>
        <div v-if="oAuthError" class="space-y-4 mb-6">
          <UAlert
            color="neutral"
            variant="subtle"
            title="Authorization failed!"
            description="Failed to generate a user access token from your Github account."
            icon="i-lucide-terminal"
          />
        </div>

        <div v-if="!hasUat" class="space-y-4">
          <h2>Authorize Github</h2>
          <p class="text-sm text-muted-foreground mt-1">Authorization on GitHub involves granting permissions to Thunder to issue a User Access Token (UAT). The encrypted token will be used by CodePipeline to watch for changes in your repository.</p>
          <UButton @click="authorizeGithub" :loading="authorizing" :disabled="authorizing">Authorize with GitHub</UButton>
        </div>
        <div v-else class="space-y-4">
          <UAlert
            color="neutral"
            variant="outline"
            title="Authorization Successful!"
            description="You have successfully generated a User Access Token (UAT) from your Github account. Now we can proceed with the deployment."
            icon="i-lucide-github"
          />
        </div>
      </ClientOnly>

      <template #footer>
        <ClientOnly>
          <div class="flex justify-start">
            <UButton
              size="lg"
              :disabled="!hasUat || isDeploying"
              :loading="isDeploying"
              @click="installApplication"
            >
              {{ isDeploying ? 'Installing...' : 'Install Application' }}
            </UButton>
          </div>
        </ClientOnly>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

definePageMeta({
  layout: 'new',
  middleware: ['github-middleware-client']
});

const { applicationSchema, oAuthError, setOAuthError } = useNewApplicationFlow();
const config = useRuntimeConfig();
const user = useSupabaseUser();

if (!applicationSchema.value.name) {
  navigateTo('/new');
}

const isDeploying = ref(false);
const authorizing = ref(false);

const hasUat = computed(() => {
  return !!applicationSchema.value.environments?.[0]?.user_access_token;
});

const authorizeGithub = () => {
  setOAuthError(false);
  authorizing.value = true;
  const githubClientId = config.public.GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/new/deploy`;
  // A random string for CSRF protection.
  const state = Math.random().toString(36).substring(7);
  const scope = 'user,repo';
  const login = user.value?.user_metadata?.user_name;
  const url = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&state=${state}&scope=${scope}&login=${login}&allow_signup=false&redirect_uri=${redirectUri}`;
  window.location.href = url;
};

const installApplication = async () => {
  isDeploying.value = true;
  // This is where the call to the backend to create the application would go.
  // For now, we'll just log it.
  console.log('Installing application with schema:', JSON.stringify(applicationSchema.value, null, 2));
  // Simulate deployment
  await new Promise(resolve => setTimeout(resolve, 2000));
  isDeploying.value = false;
  // On success, navigate to the new application's page.
  // This assumes the backend returns the new app's ID.
  // router.push(`/app/new-app-id`);
};
</script>