import { z } from 'zod';
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { StaticServiceMetadata, LambdaServiceMetadata, FargateServiceMetadata } from '~~/server/validators/common';
import type { ServiceInputSchema, ApplicationInputSchema } from '~~/server/validators/new';
import type { Provider, Branch, UserAccessToken } from '~~/server/db/schema';
import appConfig from '~/app.config';

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getResourceIdPrefix(
  application: string,
  service: string,
  environment: string,
): string {
  const sApp = sanitize(application).substring(0, 7);
  const sService = sanitize(service).substring(0, 7);
  const sEnv = sanitize(environment).substring(0, 7);

  return `${sApp}-${sService}-${sEnv}`.substring(0, 23).replace(/-$/, '');
}

const lambdaRuntimes = (appConfig as any).lambdaRuntimes as Array<{ label: string; value: string }>;
const lambdaRuntimeDefault = lambdaRuntimes[0]?.value;

export const STACK_DEFAULTS = {
  STATIC: {
    metadata: {
      debug: false,
      outputDir: 'public/',
    },
    cloudfront_metadata: {
      errorPagePath: '',
      redirects: [] as Array<{ value: string; name: string; path: string }>,
      rewrites: [] as Array<{ value: string; name: string; path: string }>,
      headers: [] as Array<{ value: string; name: string; path: string }>,
      allowHeaders: [] as string[],
      allowCookies: [] as string[],
      allowQueryParams: [] as string[],
      denyQueryParams: [] as string[],
    },
    pipeline_metadata: {
      buildProps: {
        runtime: 'nodejs',
        runtime_version: '24',
        installcmd: 'npm install',
        buildcmd: 'npm run build',
      },
    },
  },
  LAMBDA: {
    metadata: {
      debug: false,
      functionProps: {
        runtime: lambdaRuntimeDefault,
        architecture: 'x86' as const,
        memorySize: 1792,
        timeout: 30,
        keepWarm: true,
        codeDir: 'dist',
        handler: 'index.handler',
      },
    },
    pipeline_metadata: {
      buildProps: {
        runtime: 'nodejs',
        runtime_version: '22',
        installcmd: 'npm install',
        buildcmd: 'npm run build',
        include: [] as string[],
        exclude: [] as string[],
      },
    },
  },
  FARGATE: {
    metadata: {
      debug: false,
      serviceProps: {
        desiredCount: 1,
        cpu: 256,
        memorySize: 512,
        port: 3000,
        // dockerFile is NOT set by default - it's set only when scanData.hasDockerfile is true
        // This ensures strict mode: Nixpacks mode has no dockerFile, Dockerfile mode has it
        architecture: 'x86' as const,
      },
    },
    pipeline_metadata: {
      buildProps: {
        buildSystem: 'Nixpacks' as const,
        runtime_version: '20',
        installcmd: 'npm install',
        buildcmd: 'npm run build',
        startcmd: 'npm start',
        include: [] as string[],
        exclude: [] as string[],
      },
    },
  },
};

type ValidStackType = keyof typeof STACK_DEFAULTS;

const stackVersionMap = appConfig.stackTypes.reduce((acc, stackType) => {
  acc[stackType as ValidStackType] = appConfig.stackVersion;
  return acc;
}, {} as Record<ValidStackType, string>);

const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const state = useState<T>(`localStorage_${key}`, () => {
    if (process.client) {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    }
    return defaultValue;
  });
  
  watch(state, (newValue) => {
    if (process.client) {
      localStorage.setItem(key, JSON.stringify(newValue));
    }
  }, { deep: true });
  
  return state;
};

export const useNewApplicationFlow = () => {
  const { $client } = useNuxtApp();
  const route = useRoute();
  const router = useRouter();
  const applicationSchema = useLocalStorage<Partial<ApplicationInputSchema>>('newApplicationSchema', {});
  const oAuthError = useState<boolean>('newApplicationOAuthError', () => false);
  const selectedStackType = useState<ValidStackType>('selectedStackType', () => 'STATIC');
  const repoInfo = useState<{owner: string, repo: string, installation_id: number} | null>('repoInfo', () => null);

  const isLoading = useState('isLoading', () => false);
  const serviceLoading = useState('serviceLoading', () => false);
  const branches = useState<Branch[]>('branches', () => []);
  const selectedBranchName = useState<string | undefined>('selectedBranchName', () => undefined);
  const branchesLoading = useState('branchesLoading', () => false);
  const providers = useState<Provider[]>('providers', () => []);
  const selectedProviderId = useState<string | null>('selectedProviderId', () => null);
  const providerLoading = useState('providerLoading', () => false);
  const loadError = useState<string | null>('loadError', () => null);
  const scanError = useState<string | null>('scanError', () => null);
  const selectedRootDir = useState<string>('selectedRootDir', () => '/');

  const currentStep = computed(() => {
    const path = route.path;
    if (path.includes('/new/deploy')) return 3;
    if (path.includes('/new/configure')) return 2;
    return 1;
  });

  const fetchBranches = async (owner: string, repo: string, installation_id: number) => {
    try {
      const fetchedBranches = await $client.github.getBranches.query({
        owner,
        repo,
        installation_id,
      });
      branches.value = fetchedBranches || [];
      if (branches.value.length > 0) {
        const defaultBranch = branches.value.find(b => b.is_default) || branches.value[0];
        if (defaultBranch) {    
          selectedBranchName.value = defaultBranch.name;
        }
      }
    }
    catch (err: any) {
      loadError.value = err?.message || String(err) || 'Failed to load branches';
      branches.value = [];
    } finally {
      branchesLoading.value = false;
    }
  }

  watch(selectedBranchName, (newBranchName) => {
    if (!newBranchName) return;
    const service = applicationSchema.value.environments?.[0]?.services?.[0];
    if (service && service.pipeline_metadata) {
      if (!service.pipeline_metadata.sourceProps) {
        service.pipeline_metadata.sourceProps = { owner: '', repo: '', branchOrRef: newBranchName };
      } else {
        service.pipeline_metadata.sourceProps.branchOrRef = newBranchName;
      }
    }
  });

  const supabase = useSupabaseClient();
  const { selectedOrganization } = useMemberships();

  type SupabaseProvider = Omit<Provider, 'created_at' | 'updated_at' | 'deleted_at'> & {
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
  };

  const fetchProviders = async (organizationId?: string) => {
    if (!organizationId) return;
    providerLoading.value = true;
    loadError.value = null;
    try {
      const { data: supabaseProviders, error: supabaseError } = await supabase
        .from('providers')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (supabaseError) {
        loadError.value = supabaseError.message || 'Failed to load providers';
        providers.value = [];
        return;
      }

      const parsedProviders = (supabaseProviders as SupabaseProvider[] | null) || [];
      providers.value = parsedProviders.map(p => ({
        ...p,
        created_at: new Date(p.created_at),
        updated_at: p.updated_at ? new Date(p.updated_at) : null,
        deleted_at: p.deleted_at ? new Date(p.deleted_at) : null,
      }));

      if (providers.value.length > 0) {
        selectedProviderId.value = providers.value[0]?.id as string;
      }
    } catch (err: any) {
      loadError.value = err?.message || String(err) || 'Failed to load providers';
      providers.value = [];
    } finally {
      providerLoading.value = false;
    }
  };

  const setProvider = (provider: Provider) => {
    if (applicationSchema.value.environments?.[0]) {
      applicationSchema.value.environments[0].provider = provider;
    }
  };

  watch(selectedProviderId, (newId) => {
    if (!newId) return;
    const currentProviderId = applicationSchema.value.environments?.[0]?.provider?.id;
    if (currentProviderId === newId) return;

    const provider = providers.value.find(p => p.id === newId);
    if (provider) {
      setProvider(provider);
    }
  });

  const createServiceSchema = async (
    stackType: ValidStackType,
    owner: string,
    repo: string,
    installation_id: number,
    scanData: any,
    rootDir: string,
    applicationName: string,
    environmentName: string
  ): Promise<ServiceInputSchema> => {
    const serviceName = Math.random().toString(36).substring(2, 9).toLowerCase();
    const stackName = `${getResourceIdPrefix(applicationName, serviceName, environmentName)}-stack`;
    const baseService = {
      name: serviceName,
      stack_name: stackName,
      installation_id: installation_id,
      rootDir: rootDir,
      service_variables: [],
    };

    const applyBuildSettings = (buildProps: any, stackType: 'STATIC' | 'LAMBDA' | 'FARGATE' = 'STATIC') => {
      if (scanData?.buildSettings) {
        const { startcmd, ...filteredSettings } = scanData.buildSettings;
        return { ...buildProps, ...filteredSettings };
      } else {
        scanError.value = 'A package.json was not found in the selected directory.';
      }
      return buildProps;
    };

    const getStaticService = () => {
      const defaults = STACK_DEFAULTS.STATIC;
      const buildProps = applyBuildSettings(defaults.pipeline_metadata.buildProps, 'STATIC');
      
      return {
        ...baseService,
        stack_type: 'STATIC' as const,
        stack_version: appConfig.stackVersion,
        metadata: { ...defaults.metadata },
        cloudfront_metadata: { ...defaults.cloudfront_metadata },
        pipeline_metadata: {
          sourceProps: { owner, repo, branchOrRef: selectedBranchName.value || 'main' },
          buildProps,
        },
      };
    };

    const getLambdaService = () => {
      const defaults = STACK_DEFAULTS.LAMBDA;
      const buildProps: any = { ...defaults.pipeline_metadata.buildProps };
      const functionProps: any = { ...defaults.metadata.functionProps };

      // Strict mode: dockerFile and buildSystem must be synchronized
      if (scanData?.hasDockerfile) {
        // Dockerfile detected: set Container mode and dockerFile
        functionProps.dockerFile = 'Dockerfile';
        buildProps.buildSystem = 'Container';
      } else {
        // No Dockerfile: Zip mode, ensure no dockerFile
        delete functionProps.dockerFile;
        buildProps.buildSystem = 'Zip';
      }

      const finalBuildProps = applyBuildSettings(buildProps, 'LAMBDA');

      return {
        ...baseService,
        stack_type: 'LAMBDA' as const,
        stack_version: appConfig.stackVersion,
        metadata: { debug: defaults.metadata.debug, functionProps },
        pipeline_metadata: {
          sourceProps: { owner, repo, branchOrRef: selectedBranchName.value || 'main' },
          buildProps: finalBuildProps,
        },
      };
    };

    const getFargateService = () => {
      const defaults = STACK_DEFAULTS.FARGATE;
      let buildProps: any = { ...defaults.pipeline_metadata.buildProps };
      const metadata: any = { ...defaults.metadata };
      const serviceProps: any = { ...defaults.metadata.serviceProps };

      // Strict mode: dockerFile and buildSystem must be synchronized
      if (scanData?.hasDockerfile) {
        // Dockerfile detected: set Dockerfile mode and dockerFile
        buildProps.buildSystem = 'Dockerfile';
        serviceProps.dockerFile = 'Dockerfile';
      } else {
        // No Dockerfile: Nixpacks mode, ensure no dockerFile
        buildProps.buildSystem = 'Nixpacks';
        delete serviceProps.dockerFile;
      }

      buildProps = applyBuildSettings(buildProps, 'FARGATE');
      metadata.serviceProps = serviceProps;

      return {
        ...baseService,
        stack_type: 'FARGATE' as const,
        stack_version: appConfig.stackVersion,
        metadata,
        pipeline_metadata: {
          sourceProps: { owner, repo, branchOrRef: selectedBranchName.value || 'main' },
          buildProps,
        },
      };
    };

    switch (stackType) {
      case 'LAMBDA':
        return getLambdaService() as unknown as ServiceInputSchema;
      case 'FARGATE':
        return getFargateService() as unknown as ServiceInputSchema;
      case 'STATIC':
      default:
        return getStaticService() as unknown as ServiceInputSchema;
    }
  };

  const setApplicationSchema = async (owner: string, repo: string, installation_id: number, stack_type: string | null) => {
    isLoading.value = true;
    scanError.value = null;
    
    const { $posthog } = useNuxtApp();
    $posthog().capture('app_create_started', {
      repo_owner: owner,
      repo_name: repo,
      stack_type: stack_type || 'STATIC',
      installation_id
    });

    try {
        const getValidStackType = (): ValidStackType => {
          if (stack_type === 'STATIC' || stack_type === 'LAMBDA' || stack_type === 'FARGATE') {
            return stack_type;
          }
          return 'STATIC';
        };

        const validStackType = getValidStackType();
        selectedStackType.value = validStackType;
        selectedRootDir.value = '/';
        repoInfo.value = { owner, repo, installation_id };

        await Promise.all([
          fetchBranches(owner, repo, installation_id),
          fetchProviders(selectedOrganization.value?.id)
        ]);
        
        const initialProvider = providers.value[0] || undefined;
        if (initialProvider) {
            selectedProviderId.value = initialProvider.id;
        }

        const appName = repo.replace(/[-_]/g, '').substring(0, 7).toLowerCase();
        const envName = Math.random().toString(36).substring(2, 9).toLowerCase();
        
        applicationSchema.value = {
          name: appName,
          display_name: repo,
          environments: [
            {
              name: envName,
              display_name: 'preview',
              region: initialProvider?.region || 'us-east-1',
              services: [],
              provider: initialProvider,
            },
          ],
        };
        
        $posthog().capture('app_configured', {
          repo_owner: owner,
          repo_name: repo,
          stack_type: selectedStackType.value,
        });
    } catch (e: any) {
        console.error("Failed to configure application:", e);
        $posthog().capture('app_configure_failed', {
          repo_owner: owner,
          repo_name: repo,
          error: e.message
        });
        scanError.value = e.message || 'An unexpected error occurred during configuration.';
    } finally {
        isLoading.value = false;
    }
  };

  const clearApplicationSchema = () => {
    applicationSchema.value = {};
    if (process.client) {
      localStorage.removeItem('newApplicationSchema');
    }
  };

  const setUat = (uat: UserAccessToken | undefined) => {
    if (applicationSchema.value.environments?.[0]) {
      applicationSchema.value.environments[0].user_access_token = uat ? {
        ...uat,
        updated_at: uat.updated_at || new Date()
      } : uat;
    }
  };

  const setOAuthError = (error: boolean) => {
    oAuthError.value = error;
  };

  return {
    currentStep,
    applicationSchema,
    oAuthError,
    isLoading,
    serviceLoading,
    branches,
    selectedBranchName,
    providers,
    selectedProviderId,
    providerLoading,
    loadError,
    scanError,
    setApplicationSchema,
    setProvider,
    setUat,
    setOAuthError,
    clearApplicationSchema,
    selectedStackType,
    selectedRootDir,
    repoInfo,
    createServiceSchema,
  };
};
