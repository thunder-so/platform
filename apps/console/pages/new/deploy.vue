<template>
  <div>
    <UCard>
      <template #header>
        <h1>Deploy Application</h1>
      </template>

      {{ applicationSchema }}

      <div v-if="authFailed" class="space-y-4">
        <h2>Authorization failed</h2>
        <p class="text-sm text-muted-foreground mt-1">Failed to generate a user access token from your Github account.</p>
        <UButton @click="authorizeGithub">Try Again</UButton>
      </div>
      <div v-else-if="!hasUat" class="space-y-4">
        <h2>Authorize Github</h2>
        <p class="text-sm text-muted-foreground mt-1">Authorization on GitHub involves granting permissions to Thunder to issue a User Access Token (UAT). The encrypted token will be used by CodePipeline to watch for changes in your repository.</p>
        <UButton @click="authorizeGithub" :loading="authorizing" :disabled="authorizing">Authorize with GitHub</UButton>
      </div>
      <div v-else class="space-y-4">
        <h2>Authorization Successful!</h2>
        <p class="text-sm text-muted-foreground mt-1">You have successfully authorized Thunder to access your GitHub repository.</p>
      </div>

      <template #footer>
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
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import { useRouter, useRoute } from 'vue-router';

definePageMeta({
  layout: 'new',
  middleware: ['github-middleware-client']
});

const { applicationSchema } = useNewApplicationFlow();
const router = useRouter();
const route = useRoute();
const config = useRuntimeConfig();
const user = useSupabaseUser();

const isDeploying = ref(false);
const authorizing = ref(false);
const authFailed = ref(false);

const hasUat = computed(() => {
  return !!applicationSchema.value.environments?.[0]?.user_access_token;
});

const authorizeGithub = () => {
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

onMounted(() => {
  if (route.query.error) {
    authFailed.value = true;
    // Clean the URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('error');
    window.history.replaceState({}, document.title, newUrl.toString());
  }
});
</script>
