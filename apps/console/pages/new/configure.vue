<template>
  <div>
    <UCard>
      <template #header>
        <h1>Configure application</h1>
      </template>

      <div class="space-y-4">
        <UForm :state="application">
          <UFormField label="Application Name">
            <UInput v-model="application.displayName" size="lg" class="w-96" />
          </UFormField>
        </UForm>

        <UForm :state="environment" class="space-y-4">
          <UFormField label="Environment Name" description="Your default environment">
            <UInput v-model="environment.displayName" size="lg" class="w-96" />
          </UFormField>

          <div class="flex space-x-4">
            <UFormField label="AWS Account">
              <USelect 
                v-model="environment.providerId" 
                :items="providerItems" 
                class="w-96" size="lg"
              />
            </UFormField>

            <UFormField label="Region">
              <USelect 
                v-model="environment.region" 
                :items="awsRegions" 
                value-key="name" 
                option-attribute="label" 
                class="w-96" size="lg"
              />
            </UFormField>
          </div>
        </UForm>
      </div>

      <ServiceConfiguration />

      <div v-if="deploymentError" style="color: red;">{{ deploymentError }}</div>

      <template #footer>
        <div class="flex justify-start">
          <UButton 
            type="submit" 
            size="lg" 
            :loading="isDeploying" 
            @click="deployApplication"
            :disabled="isDeploying"
          >
            {{ isDeploying ? 'Saving ...' : 'Save and continue' }}
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfiguration from '~/components/application/ServiceConfiguration.vue';
import type { Provider } from '~/server/db/schema';

definePageMeta({
  layout: 'new'
});

const { 
  selectedRepo,
  application,
  environment,
  service,
  deploymentStatus,
  setDeploymentStatus,
  setProvider
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const { $client } = useNuxtApp();
const { selectedOrganization } = useMemberships();
const supabase = useSupabaseClient();
const providers = ref<Provider[]>([]);
const awsRegions = ref(appConfig.regions);
const deploymentError = ref<string | null>(null);
const isDeploying = computed(() => deploymentStatus.value === 'in_progress');

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias })));

onMounted(async () => {
  if (selectedOrganization.value?.id) {
    const { data: supabaseProviders, error: supabaseError } = await supabase
      .from('providers')
      .select('*')
      .eq('organization_id', selectedOrganization.value.id)
      .is('deleted_at', null);

    if (supabaseError) {
      throw supabaseError;
    }
    providers.value = supabaseProviders || [];
    if (providers.value.length > 0) {
      setProvider(providers.value[0]);
    }
  }
});

const deployApplication = async () => {
  deploymentError.value = null;
  setDeploymentStatus('in_progress');

  if (!selectedOrganization.value?.id) {
    deploymentError.value = 'Organization ID is missing.';
    setDeploymentStatus('failed');
    return;
  }

  if (!application.value.name) {
    deploymentError.value = 'Application name is required.';
    setDeploymentStatus('failed');
    return;
  }

  if (!selectedRepo.value) {
    deploymentError.value = 'GitHub repository not selected.';
    setDeploymentStatus('failed');
    return;
  }

  if (!environment.value.providerId) {
    deploymentError.value = 'AWS Provider not selected.';
    setDeploymentStatus('failed');
    return;
  }

  try {
    // const newApp = await $client.applications.create.mutate({
    //   organizationId: selectedOrganization.value.id,
    //   application: application.value,
    //   environment: environment.value,
    //   service: service.value,
    //   github: {
    //     repositoryId: selectedRepo.value.id,
    //     repositoryName: selectedRepo.value.full_name,
    //     owner: selectedRepo.value.owner.login,
    //     installationId: selectedRepo.value.installationId,
    //   }
    // });

    setDeploymentStatus('succeeded');
    // console.log('Application deployed successfully:', newApp);
    // TODO: Redirect to the new application's dashboard page
  } catch (error: any) {
    deploymentError.value = error.message || 'Failed to deploy application.';
    setDeploymentStatus('failed');
    console.error('Deployment error:', error);
  }
};
</script>

<style scoped></style>