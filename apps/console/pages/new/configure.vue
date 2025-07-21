<template>
  <div>
    <h1>Configure & Deploy Application</h1>

    <div>
      <label for="app-name">Application Name:</label>
      <input type="text" id="app-name" v-model="appName" />
    </div>

    <ProviderSelector />
    <ServiceConfiguration />
    <DeploymentProgress />

    <button @click="deployApplication" :disabled="isDeploying">
      {{ isDeploying ? 'Deploying...' : 'Deploy Application' }}
    </button>

    <div v-if="deploymentError" style="color: red;">{{ deploymentError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ProviderSelector from '~/components/application/ProviderSelector.vue';
import ServiceConfiguration from '~/components/application/ServiceConfiguration.vue';
import DeploymentProgress from '~/components/application/DeploymentProgress.vue';

definePageMeta({
  layout: 'new'
})

const { 
  selectedRepo,
  appName,
  serviceType,
  serviceConfig,
  selectedProviderId,
  deploymentStatus,
  organizationId,
  setAppName,
  setDeploymentStatus,
  setOrganizationId,
} = useNewApplicationFlow();

const deploymentError = ref<string | null>(null);
const isDeploying = computed(() => deploymentStatus.value === 'in_progress');

// Placeholder for organizationId - in a real app, this would come from route params or user context
onMounted(() => {
  // For demonstration, setting a dummy organization ID
  setOrganizationId('org_placeholder_id'); 
});

const deployApplication = async () => {
  deploymentError.value = null;
  setDeploymentStatus('in_progress');

  if (!organizationId.value) {
    deploymentError.value = 'Organization ID is missing.';
    setDeploymentStatus('failed');
    return;
  }

  if (!appName.value) {
    deploymentError.value = 'Application name is required.';
    setDeploymentStatus('failed');
    return;
  }

  if (!selectedRepo.value) {
    deploymentError.value = 'GitHub repository not selected.';
    setDeploymentStatus('failed');
    return;
  }

  if (!serviceType.value) {
    deploymentError.value = 'Service type not selected.';
    setDeploymentStatus('failed');
    return;
  }

  if (!selectedProviderId.value) {
    deploymentError.value = 'AWS Provider not selected.';
    setDeploymentStatus('failed');
    return;
  }

  try {
    const newApp = await $client.applications.createApplication.mutate({
      name: appName.value,
      organizationId: organizationId.value,
      githubRepositoryId: selectedRepo.value.id,
      githubRepositoryName: selectedRepo.value.full_name,
      githubOwner: selectedRepo.value.owner.login,
      githubInstallationId: selectedRepo.value.installationId,
      serviceType: serviceType.value,
      providerId: selectedProviderId.value,
      serviceConfig: serviceConfig.value,
    });

    setDeploymentStatus('succeeded');
    console.log('Application deployed successfully:', newApp);
    // TODO: Redirect to the new application's dashboard page
  } catch (error: any) {
    deploymentError.value = error.message || 'Failed to deploy application.';
    setDeploymentStatus('failed');
    console.error('Deployment error:', error);
  }
};
</script>

<style scoped></style>