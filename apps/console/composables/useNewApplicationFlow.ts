import { z } from 'zod';
import { ref, computed, watch } from 'vue';
import type { SPAServiceMetadata, FunctionServiceMetadata, WebServiceMetadata } from '~/server/validators/common';
import type { ServiceInputSchema, ApplicationInputSchema } from '~/server/validators/new';
import type { Provider, Branch, UserAccessToken } from '~/server/db/schema';
import appConfig from '~/app.config';

const lambdaRuntimes = (appConfig as any).lambdaRuntimes as Array<{ label: string; value: string }>;
const lambdaRuntimeDefault = lambdaRuntimes[0]?.value;

const STACK_DEFAULTS: {
  SPA: SPAServiceMetadata,
  FUNCTION: FunctionServiceMetadata,
  WEB_SERVICE: WebServiceMetadata,
} = {
  SPA: {
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
  FUNCTION: {
    debug: false,
    rootDir: '/',
    buildProps: {
      runtime: 'nodejs',
      runtime_version: '22',
      installcmd: 'npm install',
      buildcmd: 'npm run build',
      startcmd: 'npm start',
      include: [],
      exclude: [],
    },
    functionProps: {
      runtime: lambdaRuntimeDefault,
      architecture: 'arm',
      memorySize: 1792,
      timeout: 30,
      keepWarm: true,
      codeDir: 'dist',
      handler: 'index.handler',
    },
  },
  WEB_SERVICE: {
    debug: false,
    rootDir: '/',
    buildProps: {
      buildSystem: 'Nixpacks',
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
    }
  },
};

type ValidStackType = keyof typeof STACK_DEFAULTS;

const stackVersionMap = appConfig.stacks.reduce((acc, stack) => {
  acc[stack.type as ValidStackType] = stack.version;
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
  const applicationSchema = useLocalStorage<Partial<ApplicationInputSchema>>('newApplicationSchema', {});
  const oAuthError = useState<boolean>('newApplicationOAuthError', () => false);

  const isLoading = ref(false);
  const branches = ref<Branch[]>([]);
  const selectedBranchName = ref<string>();
  const branchesLoading = ref(false);
  const providers = ref<Provider[]>([]);
  const selectedProviderId = ref<string | null>(null);
  const providerLoading = ref(false);
  const loadError = ref<string | null>(null);
  const scanError = ref<string | null>(null);

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

  const createServiceSchema = async (
    stackType: ValidStackType,
    owner: string,
    repo: string,
    installation_id: number
  ): Promise<ServiceInputSchema> => {
    
    await fetchBranches(owner, repo, installation_id);
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

    if (stackType === 'SPA') {
      let metadata = { ...STACK_DEFAULTS.SPA };
      try {
        const buildSettings = await $client.github.scanRepository.query({ owner, repo, installation_id });
        if (buildSettings?.success === false) {
          scanError.value = buildSettings.message;
        } else if (buildSettings) {
          metadata.buildProps = { ...metadata.buildProps, ...buildSettings };
        }
      } catch (e: any) {
        console.error("scan error:", e);
        scanError.value = e.message || e;
      }
      return {
        ...baseService,
        stack_type: 'SPA',
        stack_version: stackVersionMap.SPA,
        metadata
      };
    }

    if (stackType === 'FUNCTION') {
      let metadata = { ...STACK_DEFAULTS.FUNCTION };
      try {
        const buildSettings = await $client.github.scanRepository.query({ owner, repo, installation_id });
        if (buildSettings?.success === false) {
          scanError.value = buildSettings.message;
        } else if (buildSettings) {
          metadata.buildProps = { ...metadata.buildProps, ...buildSettings };
        }
          const dockerFileStatus = await $client.github.scanForDockerfile.query({ owner, repo, installation_id });
          if (dockerFileStatus.success) {
            // set functionProps.dockerFile when a Dockerfile exists in the repo
            metadata.functionProps = {
              ...metadata.functionProps,
              dockerFile: 'Dockerfile'
            };
          } else {
            scanError.value = dockerFileStatus.message as string;
          }
      } catch (e: any) {
        console.error("scan error:", e);
      }
      return {
        ...baseService,
        stack_type: 'FUNCTION',
        stack_version: stackVersionMap.FUNCTION,
        metadata
      };
    }

    // WEB_SERVICE case
    let metadata = { ...STACK_DEFAULTS.WEB_SERVICE };
    try {
      const buildSettings = await $client.github.scanRepository.query({ owner, repo, installation_id });
      if (buildSettings?.success === false) {
        scanError.value = buildSettings.message;
      } else if (buildSettings) {
        metadata.buildProps = { ...metadata.buildProps, ...buildSettings };
      }
      const dockerFileStatus = await $client.github.scanForDockerfile.query({ owner, repo, installation_id });
      if (dockerFileStatus.success) {
        metadata.buildProps.buildSystem = 'Custom Dockerfile';
      } else {
        scanError.value = dockerFileStatus.message as string;
      }
    } catch (e: any) {
      console.error("scan error:", e);
    }
    return {
      ...baseService,
      stack_type: 'WEB_SERVICE',
      stack_version: stackVersionMap.WEB_SERVICE,
      metadata
    };
  };

  const setApplicationSchema = async (owner: string, repo: string, installation_id: number, stack_type: string | null) => {
    isLoading.value = true;
    scanError.value = null;

    try {
        const getValidStackType = (): ValidStackType => {
          if (stack_type === 'SPA' || stack_type === 'FUNCTION' || stack_type === 'WEB_SERVICE') {
            return stack_type;
          }
          return 'SPA';
        };
        
        const validStackType = getValidStackType();

        await fetchProviders(selectedOrganization.value?.id);
        const initialProvider = providers.value[0] || undefined;
        if (initialProvider) {
            selectedProviderId.value = initialProvider.id;
        }

        const serviceSchema = await createServiceSchema(validStackType, owner, repo, installation_id);

        applicationSchema.value = {
          name: repo.replace(/[-_]/g, '').substring(0, 7).toLowerCase(),
          display_name: repo,
          environments: [
            {
              name: Math.random().toString(36).substring(2, 9).toLowerCase(),
              display_name: 'preview',
              region: initialProvider?.region || 'us-east-1',
              services: [serviceSchema],
              provider: initialProvider,
            },
          ],
        };
    } catch (e: any) {
        console.error("Failed to configure application:", e);
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
  };
};
