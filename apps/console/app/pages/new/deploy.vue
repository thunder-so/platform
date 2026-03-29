<template>
  <div>
    <!-- <UCard>
      <ClientOnly><pre>{{ applicationSchema }}</pre></ClientOnly>
    </UCard> -->
    <UCard>
      <template #header>
        <h1>AWS Account and Region</h1>
      </template>

      <div class="space-y-6">
        <UFormField label="AWS Account" description="Select the AWS Account where you want to deploy." class="grid grid-cols-3 gap-4">
          <USelect 
            v-model="selectedProviderIdComputed" 
            :items="providerItems" 
            class="w-96" size="lg"
          />
        </UFormField>

        <UFormField label="Region" description="The AWS region where you want to deploy." class="grid grid-cols-3 gap-4">
          <USelect 
            v-model="regionComputed" 
            :items="awsRegions" 
            value-key="name" 
            option-attribute="label" 
            class="w-96" size="lg"
            :disabled="!applicationSchema.environments?.[0]"
          />
        </UFormField>
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
            icon="tabler:terminal"
          />
        </div>

        <div v-if="!hasUat" class="space-y-4">
          <p class="text-sm text-muted-foreground">Authorization with GitHub involves granting permissions to Thunder to issue an access token on your behalf.</p> 
          <p class="text-sm text-muted-foreground">The access token will be used by AWS CodePipeline to watch for changes in your Github repository via webhook. Find out more at our <NuxtLink class="text-highlighted hover:underline" to="https://www.thunder.so/docs/aws">documentation</NuxtLink>.</p>
          <UButton 
            size="lg"
            icon="tabler:brand-github"
            @click="handleAuthorize" 
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
            icon="tabler:brand-github"
          />
        </div>
      </ClientOnly>
      
      <template #footer>
        <ClientOnly>
          <div class="flex flex-col gap-3">
            <UAlert v-if="deployError" color="error" variant="soft" title="Deployment failed" :description="deployError" icon="tabler:alert-circle" />
            <div class="flex justify-start">
              <UButton
                size="lg"
                icon="tabler:brand-aws"
                :disabled="!hasUat || isDeploying"
                :loading="isDeploying"
                @click="installApplication"
              >
                {{ isDeploying ? 'Deploying...' : 'Deploy Application' }}
              </UButton>
            </div>
          </div>
        </ClientOnly>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

definePageMeta({
  layout: 'new'
});

const { applicationSchema, oAuthError, setOAuthError, clearApplicationSchema, setUat, providers, selectedProviderId } = useNewApplicationFlow();
const appConfig = useAppConfig();
const awsRegions = ref(appConfig.regions);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias || p.id })));
const selectedProviderIdComputed = computed({
  get: () => selectedProviderId.value || undefined,
  set: (value) => { selectedProviderId.value = value || null; }
});
const regionComputed = computed({
  get: () => applicationSchema.value.environments?.[0]?.region,
  set: (value) => {
    if (applicationSchema.value.environments?.[0] && value) {
      applicationSchema.value.environments[0].region = value;
    }
  }
});;
const { selectedOrganization } = useMemberships()
const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();
const { openOAuthPopup } = useGithubPopup();

if (!applicationSchema.value.name) {
  navigateTo('/new');
}

const isDeploying = ref(false);
const authorizing = ref(false);
const deployError = ref<string | null>(null);

const hasUat = computed(() => {
  return !!applicationSchema.value.environments?.[0]?.user_access_token;
});

const handleAuthorize = async () => {
  setOAuthError(false);
  authorizing.value = true;
  const { $posthog } = useNuxtApp();
  
  try {
    const userAccessToken = await openOAuthPopup();
    setUat(userAccessToken);
    $posthog().capture('github_user_token_generated', {
      app_name: applicationSchema.value.display_name,
      repo: `${applicationSchema.value.environments?.[0]?.services?.[0]?.pipeline_metadata?.sourceProps?.owner}/${applicationSchema.value.environments?.[0]?.services?.[0]?.pipeline_metadata?.sourceProps?.repo}`
    });
    toast.add({
      title: 'GitHub authorization successful',
      color: 'success'
    });
  } catch (error: any) {
    if (error.message !== 'OAuth cancelled') {
      setOAuthError(true);
      $posthog().capture('github_user_token_failed', {
        error: error.message,
        app_name: applicationSchema.value.display_name
      });
      toast.add({
        title: 'Authorization failed',
        description: error.message,
        color: 'error'
      });
    }
  } finally {
    authorizing.value = false;
  }
};

const installApplication = async () => {
  if (!applicationSchema.value) {
    console.error('Application schema is required');
    return;
  }
  isDeploying.value = true;
  const { $posthog } = useNuxtApp();
  
  try {
    const result = await $client.applications.create.mutate({
      organization_id: selectedOrganization.value?.id as string,
      ...(applicationSchema.value as any)
    });
    if (result.newApplicationId) {
      $posthog().capture('app_created', {
        app_id: result.newApplicationId,
        app_name: applicationSchema.value.display_name,
        stack_type: applicationSchema.value.environments?.[0]?.services?.[0]?.stack_type,
        repo: `${applicationSchema.value.environments?.[0]?.services?.[0]?.pipeline_metadata?.sourceProps?.owner}/${applicationSchema.value.environments?.[0]?.services?.[0]?.pipeline_metadata?.sourceProps?.repo}`,
        org_id: selectedOrganization.value?.id
      });
      clearApplicationSchema();
      router.push(`/app/${result.newApplicationId}`);
    }
  } catch (error) {
    deployError.value = (error as Error).message || 'Failed to deploy application. Please try again.';
    $posthog().capture('app_creation_failed', {
      app_name: applicationSchema.value.display_name,
      error: (error as Error).message,
      org_id: selectedOrganization.value?.id
    });
    console.error('Failed to install application:', error);
  } finally {
    isDeploying.value = false;
  }
};
</script>