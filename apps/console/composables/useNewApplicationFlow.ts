import { ref } from 'vue';

export const useNewApplicationFlow = () => {
  const selectedRepo = ref<any>(null);
  const githubUserAccessToken = ref<string | null>(null);
  const appName = ref<string>('');
  const serviceType = ref<string>('');
  const serviceConfig = ref<any>({});
  const selectedProviderId = ref<string | null>(null);
  const deploymentStatus = ref<string>('idle');
  const organizationId = ref<string | null>(null); // Added organizationId

  const setRepo = (repo: any) => {
    selectedRepo.value = repo;
  };

  const setGithubToken = (token: string) => {
    githubUserAccessToken.value = token;
  };

  const setAppName = (name: string) => {
    appName.value = name;
  };

  const setServiceType = (type: string) => {
    serviceType.value = type;
  };

  const setServiceConfig = (config: any) => {
    serviceConfig.value = config;
  };

  const setProviderId = (providerId: string) => {
    selectedProviderId.value = providerId;
  };

  const setDeploymentStatus = (status: string) => {
    deploymentStatus.value = status;
  };

  const setOrganizationId = (id: string) => { // Added setter for organizationId
    organizationId.value = id;
  };

  return {
    selectedRepo,
    githubUserAccessToken,
    appName,
    serviceType,
    serviceConfig,
    selectedProviderId,
    deploymentStatus,
    organizationId, // Export organizationId
    setRepo,
    setGithubToken,
    setAppName,
    setServiceType,
    setServiceConfig,
    setProviderId,
    setDeploymentStatus,
    setOrganizationId, // Export setter
  };
};