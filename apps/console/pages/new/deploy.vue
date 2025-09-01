<template>
  <div>
    <!-- <UCard>
      <pre>{{ applicationSchema }}</pre>
    </UCard> -->
    <UCard>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <Icon name="mdi:github" class="w-6 h-6 text-gray-700" />
          <div>
            <h3 class="text-md font-medium">{{ applicationSchema.display_name }}</h3>
            <a 
              :href="`https://github.com/${applicationSchema.environments?.[0]?.services?.[0]?.owner}/${applicationSchema.environments?.[0]?.services?.[0]?.repo}`"
              target="_blank"
              class="text-sm text-gray-600 hover:underline"
            >
              {{ applicationSchema.environments?.[0]?.services?.[0]?.owner }}/{{ applicationSchema.environments?.[0]?.services?.[0]?.repo }}
            </a>
          </div>
        </div>
        
        <Icon name="mdi:arrow-right" class="w-5 h-5 text-gray-400" />
        
        <div class="flex items-center space-x-3">
          <Icon name="mdi:aws" class="w-6 h-6 text-orange-500" />
          <div>
            <h3 class="text-md font-medium">{{ applicationSchema.environments?.[0]?.provider?.alias }}</h3>
            <p class="text-sm text-gray-600">
              {{ applicationSchema.environments?.[0]?.provider?.account_id }} • {{ applicationSchema.environments?.[0]?.region }}
            </p>
          </div>
        </div>
      </div>
    </UCard>
    <UCard class="mt-6 mb-6">
      <template #header>
        <h1>Authorize and Deploy</h1>
      </template>

      <ClientOnly>
        <div v-if="oAuthError" class="space-y-4 mb-6">
          <UAlert
            class="mb-4"
            color="error"
            variant="soft"
            title="Authorization failed!"
            description="Failed to generate an access token from your Github account."
            icon="i-lucide-terminal"
          />
        </div>

        <div v-if="!hasUat" class="space-y-4">
          <p class="text-sm text-muted-foreground">Authorization with GitHub involves granting permissions to Thunder to issue an access token on your behalf.</p> 
          <p class="text-sm text-muted-foreground">The access token will be used by AWS CodePipeline to watch for changes in your Github repository via webhook. Find out more at our <NuxtLink class="no-underline hover:underline" to="https://www.thunder.so/docs/aws">documentation</NuxtLink>.</p>
          <UButton 
            size="lg"
            icon="mdi:github"
            @click="authorizeGithub" 
            :loading="authorizing" 
            :disabled="authorizing">Authorize with GitHub
          </UButton>
        </div>
        <div v-else class="space-y-4">
          <UAlert
            color="success"
            variant="soft"
            title="Authorization Successful!"
            description="You have successfully generated an access token. Now we can proceed with the deployment."
            icon="i-lucide-github"
          />
        </div>
      </ClientOnly>
      
      <template #footer>
        <ClientOnly>
          <div class="flex justify-start">
            <UButton
              size="lg"
              icon="mdi:aws"
              :disabled="!hasUat || isDeploying"
              :loading="isDeploying"
              @click="installApplication"
            >
              {{ isDeploying ? 'Deploying...' : 'Deploy Application' }}
            </UButton>
          </div>
        </ClientOnly>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import { type ApplicationInputSchema } from '~/server/validators/new';

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
      ...(applicationSchema.value as ApplicationInputSchema)
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