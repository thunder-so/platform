import { z } from 'zod';
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { StaticServiceMetadata, LambdaServiceMetadata, FargateServiceMetadata } from '~~/server/validators/common';
import type { ServiceInputSchema, ApplicationInputSchema } from '~~/server/validators/new';
import type { Provider, Branch, UserAccessToken } from '~~/server/db/schema';
import appConfig from '~/app.config';

const lambdaRuntimes = (appConfig as any).lambdaRuntimes as Array<{ label: string; value: string }>;
const lambdaRuntimeDefault = lambdaRuntimes[0]?.value;

const STACK_DEFAULTS: {
  STATIC: StaticServiceMetadata,
  LAMBDA: LambdaServiceMetadata,
  FARGATE: FargateServiceMetadata,
} = {
  STATIC: {
    debug: false,
    rootDir: '/',
    outputDir: 'public/',
    errorPagePath: '',
    redirects: [],
    rewrites: [],
    headers: [],
    allowHeaders: [],
    allowCookies: [],
    allowQueryParams: [],
    denyQueryParams: [],
    buildProps: {
      runtime: 'nodejs',
      runtime_version: '24',
      installcmd: 'npm install',
      buildcmd: 'npm run build',
    },
  },
  LAMBDA: {
    debug: false,
    rootDir: '/',
    buildProps: {
      runtime: 'nodejs',
      runtime_version: '22',
      installcmd: 'npm install',
      buildcmd: 'npm run build',
      include: [],
      exclude: [],
    },
    functionProps: {
      runtime: lambdaRuntimeDefault,
      architecture: 'x86',
      memorySize: 1792,
      timeout: 30,
      keepWarm: true,
      codeDir: 'dist',
      handler: 'index.handler',
    },
  },
  FARGATE: {
    debug: false,
    rootDir: '/',
    buildProps: {
      buildSystem: 'Nixpacks',
      runtime_version: '20',
      installcmd: 'npm install',
      buildcmd: 'npm run build',
      startcmd: 'npm start',
      include: [],
      exclude: [],
    },
    serviceProps: {
      desiredCount: 1,
      cpu: 256,
      memorySize: 512,
      port: 3000,
      dockerFile: 'Dockerfile',
      architecture: 'x86',
    }
  },
};

type ValidStackType = keyof typeof STACK_DEFAULTS;

const stackVersionMap = appConfig.stackTypes.reduce((acc, stackType) => {
  acc[stackType as ValidStackType] = appConfig.stackVersion;
  return acc;
}, {} as Record<ValidStackType, string>);

const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const storedValue = process.client ? localStorage.getItem(key) : null;
  const initialValue = storedValue ? JSON.parse(storedValue) : defaultValue;
  const state = ref<T>(initialValue);
  
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
  const selectedStackType = ref<ValidStackType>('STATIC');
  const repoInfo = ref<{owner: string, repo: string, installation_id: number} | null>(null);

  const isLoading = ref(false);
  const serviceLoading = ref(false);
  const branches = ref<Branch[]>([]);
  const selectedBranchName = ref<string>();
  const branchesLoading = ref(false);
  const providers = ref<Provider[]>([]);
  const selectedProviderId = ref<string | null>(null);
  const providerLoading = ref(false);
  const loadError = ref<string | null>(null);
  const scanError = ref<string | null>(null);
  
  // Cache for scan results
  const scanCache = ref<{
    buildSettings?: any;
    dockerFileStatus?: any;
  }>({});

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
    if (service) {
      service.branch = newBranchName;
    }
  });

  const supabase = useSupabaseClient();
  const { selectedOrganization } = useMemberships();

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

      providers.value = supabaseProviders || [];
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

  const fetchScanData = async (owner: string, repo: string, installation_id: number, stackType: ValidStackType) => {
    const { $posthog } = useNuxtApp();
    
    // Fetch buildSettings if not cached
    if (!scanCache.value.buildSettings) {
      try {
        scanCache.value.buildSettings = await $client.github.scanRepository.query({ owner, repo, installation_id });
      } catch (e: any) {
        console.error("scan error:", e);
        $posthog().capture('repo_scan_failed', {
          stack_type: stackType,
          error: e.message,
          repo: `${owner}/${repo}`
        });
        scanError.value = e.message || e;
      }
    }

    // Fetch dockerFileStatus only for LAMBDA and FARGATE if not cached
    if ((stackType === 'LAMBDA' || stackType === 'FARGATE') && !scanCache.value.dockerFileStatus) {
      try {
        scanCache.value.dockerFileStatus = await $client.github.scanForDockerfile.query({ owner, repo, installation_id });
      } catch (e: any) {
        console.error("dockerfile scan error:", e);
        scanError.value = e.message || e;
      }
    }
  };

  const createServiceSchema = async (
    stackType: ValidStackType,
    owner: string,
    repo: string,
    installation_id: number
  ): Promise<ServiceInputSchema> => {
    const name = Math.random().toString(36).substring(2, 9).toLowerCase();
    const baseService = {
      name: name,
      display_name: repo,
      installation_id: installation_id,
      owner,
      repo,
      branch: selectedBranchName.value || 'main',
      service_variables: [],
    };

    const { $posthog } = useNuxtApp();
    let metadata = { ...STACK_DEFAULTS[stackType] };

    // Apply cached buildSettings if available
    if (scanCache.value.buildSettings?.success === false) {
      scanError.value = scanCache.value.buildSettings.message;
    } else if (scanCache.value.buildSettings) {
      metadata.buildProps = { ...metadata.buildProps, ...scanCache.value.buildSettings };
    }

    // Apply dockerFile settings for LAMBDA and FARGATE
    if (stackType === 'LAMBDA' && scanCache.value.dockerFileStatus?.success) {
      metadata.functionProps = {
        ...metadata.functionProps,
        dockerFile: 'Dockerfile'
      };
    } else if (stackType === 'FARGATE' && scanCache.value.dockerFileStatus?.success) {
      metadata.buildProps.buildSystem = 'Custom Dockerfile';
    } else if ((stackType === 'LAMBDA' || stackType === 'FARGATE') && scanCache.value.dockerFileStatus?.message) {
      scanError.value = scanCache.value.dockerFileStatus.message as string;
    }

    return {
      ...baseService,
      stack_type: stackType,
      stack_version: appConfig.stackVersion,
      metadata
    };
  };

  const setApplicationSchema = async (owner: string, repo: string, installation_id: number, stack_type: string | null) => {
    isLoading.value = true;
    scanError.value = null;

    repoInfo.value = { owner, repo, installation_id };

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

        await Promise.all([
          fetchBranches(owner, repo, installation_id),
          fetchProviders(selectedOrganization.value?.id)
        ]);
        
        const initialProvider = providers.value[0] || undefined;
        if (initialProvider) {
            selectedProviderId.value = initialProvider.id;
        }

        applicationSchema.value = {
          name: repo.replace(/[-_]/g, '').substring(0, 7).toLowerCase(),
          display_name: repo,
          environments: [
            {
              name: Math.random().toString(36).substring(2, 9).toLowerCase(),
              display_name: 'preview',
              region: initialProvider?.region || 'us-east-1',
              services: [],
              provider: initialProvider,
            },
          ],
        };

        await createAndSetServiceSchema(validStackType, owner, repo, installation_id);
        
        $posthog().capture('app_configured', {
          repo_owner: owner,
          repo_name: repo,
          stack_type: selectedStackType.value,
          has_scan_error: !!scanError.value
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

  const createAndSetServiceSchema = async (stackType: ValidStackType, owner: string, repo: string, installation_id: number) => {
    serviceLoading.value = true;
    scanError.value = null;
    try {
      await fetchScanData(owner, repo, installation_id, stackType);
      const serviceSchema = await createServiceSchema(stackType, owner, repo, installation_id);
      if (applicationSchema.value.environments && applicationSchema.value.environments[0]) {
        applicationSchema.value.environments[0].services = [serviceSchema];
      }
    } catch (e: any) {
      console.error("Failed to create and set service schema:", e);
      scanError.value = e.message || 'An unexpected error occurred during service configuration.';
    } finally {
      serviceLoading.value = false;
    }
  };

  watch(selectedStackType, async (newStackType, oldStackType) => {
    if (!oldStackType || newStackType === oldStackType) return;

    // Update URL without reloading page
    const currentQuery = { ...route.query };
    currentQuery.stack_type = newStackType;
    router.replace({ query: currentQuery });

    if (repoInfo.value) {
      const { owner, repo, installation_id } = repoInfo.value;
      await createAndSetServiceSchema(newStackType, owner, repo, installation_id);
    }
  }, { immediate: false });

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
    repoInfo,
    createAndSetServiceSchema,
  };
};
