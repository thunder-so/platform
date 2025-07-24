import { watch, computed } from 'vue';
import type { Organization, Application, Environment, Service, Provider } from '~/server/db/schema';

export const useNewApplicationFlow = () => {
  const route = useRoute();
  const selectedRepo = useState<any>('selectedRepo', () => null);
  const githubUserAccessToken = useState<string | null>('githubUserAccessToken', () => null);
  const organization = useState<Organization | null>('organization', () => null);
  const application = useState<Partial<Application>>('application', () => ({}));
  const environment = useState<Partial<Environment>>('environment', () => ({}));
  const service = useState<Partial<Service>>('service', () => ({}));
  const deploymentStatus = useState<string>('deploymentStatus', () => 'idle');

  const currentStep = computed(() => {
    const path = route.path;
    if (path.includes('/new/deploy')) {
      return 3;
    }
    if (path.includes('/new/configure')) {
      return 2;
    }
    return 1;
  });

  const setRepo = (repo: any) => {
    selectedRepo.value = repo;
    if (repo) {
      application.value.name = repo.name;
      application.value.display_name = repo.name;
    }
  };

  const setGithubToken = (token: string) => {
    githubUserAccessToken.value = token;
  };

  const setOrganization = (org: Organization) => {
    organization.value = org;
  };

  const setProvider = (provider: Provider) => {
    if (environment.value) {
      environment.value.provider_id = provider.id;
      environment.value.region = provider.region;
    }
  };

  const setDeploymentStatus = (status: string) => {
    deploymentStatus.value = status;
  };

  const setServiceType = (type: Service['stack_type']) => {
    if (service.value) {
      service.value.stack_type = type;
    }
  };

  watch(selectedRepo, (repo) => {
    if(repo) {
      application.value.name = repo.name;
      application.value.display_name = repo.name;
      environment.value.name = 'preview';
      environment.value.display_name = 'preview';
    }
  }, { deep: true });

  return {
    selectedRepo,
    githubUserAccessToken,
    organization,
    application,
    environment,
    service,
    deploymentStatus,
    currentStep,
    setRepo,
    setGithubToken,
    setOrganization,
    setProvider,
    setDeploymentStatus,
    setServiceType,
  };
};