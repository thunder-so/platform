<template>
  <div>
    <UCard>
      <template #header>
        <h1>Deploy Application</h1>
      </template>

      <ClientOnly>
        {{ applicationSchema }}
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
import type { ApplicationInputSchema } from '~/server/trpc/routers/applications.router';

definePageMeta({
  layout: 'new',
  middleware: ['github-middleware-client']
});

const { applicationSchema, oAuthError, setOAuthError, clearApplicationSchema } = useNewApplicationFlow();
const { selectedOrganization } = useMemberships()
const config = useRuntimeConfig();
const user = useSupabaseUser();
const { $client } = useNuxtApp();
const router = useRouter();

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
  if (!applicationSchema.value) {
    console.error('Application schema is required');
    return;
  }
  isDeploying.value = true;
  try {
    const result = await $client.applications.create.mutate({
      organization_id: selectedOrganization.value?.id as string,
      applicationInputSchema: applicationSchema.value as ApplicationInputSchema
    });
    if (result.newApplicationId) {
      clearApplicationSchema();
      router.push(`/app/${result.newApplicationId}`);
    }
  } catch (error) {
    console.error('Failed to install application:', error);
    // Here you could show a toast or other error notification
  } finally {
    isDeploying.value = false;
  }
};
</script>