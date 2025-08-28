import { z } from 'zod';
import { ref, computed, watchEffect } from 'vue';
import type { ApplicationInputSchema, functionMetadataSchema, webServiceMetadataSchema } from '~/server/db/types';
import type { UserAccessToken, Provider, SpaMetadata, NodeBasedBuildProps, SourceProps, Service, Branch } from '~/server/db/schema';

type ServiceInputSchema = ApplicationInputSchema['environments'][0]['services'][0];
type FunctionMetadataInputSchema = z.infer<typeof functionMetadataSchema>;
type WebServiceMetadataInputSchema = z.infer<typeof webServiceMetadataSchema>;

const STACK_DEFAULTS: {
  SPA: { metadata: SpaMetadata, buildProps: NodeBasedBuildProps },
  FUNCTION: { metadata: FunctionMetadataInputSchema },
  WEB_SERVICE: { metadata: WebServiceMetadataInputSchema },
} = {
  SPA: {
    metadata: { outputDir: 'public/' },
    buildProps: {
      runtime: 'nodejs',
      runtime_version: '24',
      installcmd: 'npm install',
      buildcmd: 'npm run build',
      environment: [],
    },
  },
  FUNCTION: {
    metadata: {
      dockerFile: 'Dockerfile',
      memorySize: 1792,
      keepWarm: true,
      buildSystem: 'Nixpacks',
      variables: [] as Record<string, string>[],
    },
  },
  WEB_SERVICE: {
    metadata: {
      dockerFile: 'Dockerfile',
      desiredCount: 1,
      cpu: 0.25,
      memorySize: 1792,
      port: 3000,
      buildSystem: 'Nixpacks',
      variables: [] as Record<string, string>[],
    },
  },
};

type ValidStackType = keyof typeof STACK_DEFAULTS;

export const useNewApplicationFlow = () => {
  const { $client } = useNuxtApp();
  const route = useRoute();
  const router = useRouter();
  const applicationSchema = useCookie<Partial<ApplicationInputSchema>>('newApplicationSchema', { default: () => ({}) });
  const oAuthError = useState<boolean>('newApplicationOAuthError', () => false);

  const isLoading = ref(false);
  const branches = ref<Branch[]>([]);
  const selectedBranchName = ref<string>();
  const branchesLoading = ref(false);
  const scannedBuildProps = ref<Partial<NodeBasedBuildProps> | null>(null);
  const providers = ref<Provider[]>([]);
  const selectedProviderId = ref<string | null>(null);
  const providerLoading = ref(false);
  const loadError = ref<string | null>(null);
  const scanError = ref<string | undefined>(undefined);

  const currentStep = computed(() => {
    const path = route.path;
    if (path.includes('/new/deploy')) return 3;
    if (path.includes('/new/configure')) return 2;
    return 1;
  });

  /**
   * Fetch branches and scan the selected repository
   */
  const fetchBranches = async (owner: string, repo: string, installation_id: number, stack_type: string) => {
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
    if (service?.pipeline_props?.sourceProps) {
      service.pipeline_props.sourceProps.branchOrRef = newBranchName;
    }
  });

  /**
   * Handle provider fetching and selection
   */
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
        // set first provider as selected by default
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
      const providerForInput: ApplicationInputSchema['environments'][0]['provider'] = {
        ...provider,
        region: provider.region || 'us-east-1',
        created_at: new Date(provider.created_at).toISOString(),
        updated_at: provider.updated_at ? new Date(provider.updated_at).toISOString() : null,
        deleted_at: provider.deleted_at ? new Date(provider.deleted_at).toISOString() : null,
      };
      applicationSchema.value.environments[0].provider = providerForInput;
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

  /**
   * Scan the repository for build settings
   */
  const scanRepository = async (owner: string, repo: string, installation_id: number) => {
    const buildSettings = await $client.github.scanRepository.query({
      owner,
      repo,
      installation_id,
    });
    if (buildSettings) {
      scannedBuildProps.value = buildSettings;
    }
  }

  const scanForDockerfile = async (owner: string, repo: string, installation_id: number) => {
    const result = await $client.github.scanForDockerfile.query({
      owner,
      repo,
      installation_id,
    });

    return result
  }

  /**
   * Create a service schema based on the selected stack type
   */
  const createServiceSchema = async (
    stackType: ValidStackType,
    owner: string,
    repo: string,
    installation_id: number
  ): Promise<ServiceInputSchema> => {
    const baseService = {
      name: stackType.toLowerCase(),
      display_name: stackType,
      stack_version: '1.0',
      installation_id: installation_id,
      app_props: { rootDir: '/' },
      cdn_props: null,
      edge_props: null,
      domain_props: null,
    };

    if (stackType === 'SPA') {
      try {
        await scanRepository(owner, repo, installation_id);
      } catch (e: any) {
        console.error("scan error:", e);
        scanError.value = e.message || e;
      }
    }
    else if (stackType === 'FUNCTION' || stackType === 'WEB_SERVICE') {
      try {
        const dockerFileStatus = await scanForDockerfile(owner, repo, installation_id);
        if (dockerFileStatus.success) {
          STACK_DEFAULTS[stackType].metadata.buildSystem = 'Custom Dockerfile';
        }
      } catch (e: any) {
        console.error("scan error:", e);
        // scanError.value = e.message || e;
      }
    }

    await fetchBranches(owner, repo, installation_id, stackType);

    const sourceProps: SourceProps = {
      owner,
      repo,
      branchOrRef: selectedBranchName.value || 'main',
    };

    switch (stackType) {
      case 'SPA':
        return {
          ...baseService,
          stack_type: 'SPA',
          metadata: STACK_DEFAULTS.SPA.metadata,
          pipeline_props: {
            sourceProps,
            buildProps: { ...STACK_DEFAULTS.SPA.buildProps, ...scannedBuildProps.value },
          },
        };
      case 'FUNCTION':
        return {
          ...baseService,
          stack_type: 'FUNCTION',
          metadata: STACK_DEFAULTS.FUNCTION.metadata,
          pipeline_props: { sourceProps },
        };
      case 'WEB_SERVICE':
        return {
          ...baseService,
          stack_type: 'WEB_SERVICE',
          metadata: STACK_DEFAULTS.WEB_SERVICE.metadata,
          pipeline_props: { sourceProps },
        };
    }
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

        const [serviceSchema] = await Promise.all([
            createServiceSchema(validStackType, owner, repo, installation_id),
            fetchProviders(selectedOrganization.value?.id),
        ]);

        // Now that providers are fetched, we can get the default one
        const initialProvider = providers.value[0] || undefined;
        if (initialProvider) {
            selectedProviderId.value = initialProvider.id;
        }

        // Fetch branches after service schema is ready
        // await fetchBranches(owner, repo, installation_id, validStackType);

        applicationSchema.value = {
          name: repo.replace(/[-_]/g, '').substring(0, 12),
          display_name: repo,
          environments: [
            {
              name: 'preview',
              display_name: 'preview',
              region: 'us-east-1',
              services: [serviceSchema],
              provider: initialProvider ? {
                  ...initialProvider,
                  region: initialProvider.region || 'us-east-1',
                  created_at: new Date(initialProvider.created_at).toISOString(),
                  updated_at: initialProvider.updated_at ? new Date(initialProvider.updated_at).toISOString() : null,
                  deleted_at: initialProvider.deleted_at ? new Date(initialProvider.deleted_at).toISOString() : null,
              } : undefined,
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
  };

  const setUat = (uat: UserAccessToken | undefined) => {
    if (applicationSchema.value.environments?.[0]) {
      applicationSchema.value.environments[0].user_access_token = uat;
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
