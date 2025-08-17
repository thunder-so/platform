import { ref, computed, watchEffect } from 'vue';
import type { ApplicationInputSchema } from '~/server/trpc/routers/applications.router';
import type { UserAccessToken, Provider, SpaMetadata, NodeBasedBuildProps, SourceProps, Service, Branch } from '~/server/db/schema';

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

type FunctionMetadataInput = {
  buildSystem?: 'Nixpacks' | 'Buildpacks' | 'Custom Dockerfile';
  dockerFile?: string;
  memorySize?: number;
  timeout?: number;
  keepWarm?: boolean;
  url?: boolean;
  runtime?: 'nodejs20.x' | 'nodejs22.x' | 'nodejs24.x';
  architecture?: 'x86_64' | 'ARM_64';
  codeDir?: string;
  handler?: string;
  include?: string[];
  exclude?: string[];
  tracing?: boolean;
  reservedConcurrency?: number;
  provisionedConcurrency?: number;
  variables?: { key: string; value: string }[];
  secrets?: { key: string; resource: string }[];
  dockerBuildArgs?: string[];
};

type WebServiceMetadataInput = {
  buildSystem?: 'Nixpacks' | 'Buildpacks' | 'Custom Dockerfile';
  dockerFile?: string;
  desiredCount: number;
  cpu?: number;
  memorySize?: number;
  port?: number;
  architecture?: 'x86_64' | 'ARM64';
  variables?: { key: string; value: string }[];
  secrets?: { key: string; resource: string }[];
  dockerBuildArgs?: string[];
};

const STACK_DEFAULTS: {
  SPA: { metadata: SpaMetadata, buildProps: NodeBasedBuildProps },
  FUNCTION: { metadata: FunctionMetadataInput },
  WEB_SERVICE: { metadata: WebServiceMetadataInput },
} = {
  SPA: {
    metadata: { outputDir: 'public/' },
    buildProps: {
      runtime: 'nodejs',
      runtime_version: '24',
      installcmd: 'npm install',
      buildcmd: 'npm run build',
    },
  },
  FUNCTION: {
    metadata: {
      dockerFile: 'Dockerfile',
      memorySize: 1792,
      keepWarm: true,
      buildSystem: 'Nixpacks',
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
  const scannedBuildProps = ref<Partial<NodeBasedBuildProps> | null>(null);
  const providers = ref<Provider[]>([]);
  const selectedProviderId = ref<string | null>(null);
  const providerLoading = ref(false);
  const providerError = ref<string | null>(null);

  const currentStep = computed(() => {
    const path = route.path;
    if (path.includes('/new/deploy')) return 3;
    if (path.includes('/new/configure')) return 2;
    return 1;
  });

  // const sourceInfo = computed(() => {
  //   const service = applicationSchema.value.environments?.[0]?.services?.[0];
  //   if (!service) return null;
  //   return {
  //     owner: service.pipeline_props?.sourceProps?.owner,
  //     repo: service.pipeline_props?.sourceProps?.repo,
  //     installation_id: service.installation_id,
  //     stack_type: service.stack_type,
  //   };
  // });

  // watch(sourceInfo, async (newSourceInfo) => {
  //   if (!newSourceInfo) return;

  //   const { owner, repo, installation_id, stack_type } = newSourceInfo;

  //   if (!owner || !repo || !installation_id) return;

  //   if (typeof window === 'undefined' || !$client || !($client as any).github) {
  //     return;
  //   }

  //   isLoading.value = true;
  //   try {
  //     const fetchedBranches = await $client.github.getBranches.query({
  //       owner,
  //       repo,
  //       installation_id,
  //     });
  //     branches.value = fetchedBranches || [];
  //     const defaultBranch = fetchedBranches.find(b => b.is_default);
  //     const service = applicationSchema.value.environments?.[0]?.services?.[0];
  //     if (defaultBranch && service?.pipeline_props?.sourceProps) {
  //       service.pipeline_props.sourceProps.branchOrRef = defaultBranch.name;
  //     }

  //     if (stack_type === 'SPA') {
  //       const buildSettings = await $client.github.scanRepository.query({
  //         owner,
  //         repo,
  //         installation_id,
  //       });
  //       if (buildSettings) {
  //         scannedBuildProps.value = buildSettings;
  //         if (service?.pipeline_props?.buildProps) {
  //           service.pipeline_props.buildProps.runtime_version = buildSettings.runtime;
  //           service.pipeline_props.buildProps.installcmd = buildSettings.installCommand;
  //           service.pipeline_props.buildProps.buildcmd = buildSettings.buildCommand;
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error fetching repository details:", error);
  //   } finally {
  //     isLoading.value = false;
  //   }
  // }, { deep: true });

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
      const defaultBranch = fetchedBranches.find(b => b.is_default);
      const service = applicationSchema.value.environments?.[0]?.services?.[0];
      if (defaultBranch && service?.pipeline_props?.sourceProps) {
        service.pipeline_props.sourceProps.branchOrRef = defaultBranch.name;
      }
    } catch (error) {
      console.error("Error fetching repository details:", error);
    }
  }

  /**
   * Handle provider fetching and selection
   */
  const supabase = useSupabaseClient();
  const { selectedOrganization } = useMemberships();

  const fetchProviders = async (organizationId?: string) => {
    if (!organizationId) return;
    providerLoading.value = true;
    providerError.value = null;
    try {
      const { data: supabaseProviders, error: supabaseError } = await supabase
        .from('providers')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (supabaseError) {
        providerError.value = supabaseError.message || 'Failed to load providers';
        providers.value = [];
        return;
      }

      providers.value = supabaseProviders || [];
      if (providers.value.length > 0) {
        // set first provider as selected by default
        selectedProviderId.value = providers.value[0]?.id as string;
      }
    } catch (err: any) {
      providerError.value = err?.message || String(err) || 'Failed to load providers';
      providers.value = [];
    } finally {
      providerLoading.value = false;
    }
  };

  const setProvider = (provider: Provider) => {
    if (applicationSchema.value.environments?.[0]) {
      const providerForInput: ApplicationInputSchema['environments'][0]['provider'] = {
        ...provider,
        created_at: new Date(provider.created_at).toISOString(),
        updated_at: provider.updated_at ? new Date(provider.updated_at).toISOString() : null,
        deleted_at: provider.deleted_at ? new Date(provider.deleted_at).toISOString() : null,
      };
      applicationSchema.value.environments[0].provider = providerForInput;
    }
  };

  watch(selectedProviderId, (newId) => {
    if (!newId) return;
    // Avoid redundant updates if the provider is already set on the application schema
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
      // const service = applicationSchema.value.environments?.[0]?.services?.[0];
      // if (service?.pipeline_props?.buildProps) {
      //   service.pipeline_props.buildProps.runtime_version = buildSettings.runtime;
      //   service.pipeline_props.buildProps.installcmd = buildSettings.installCommand;
      //   service.pipeline_props.buildProps.buildcmd = buildSettings.buildCommand;
      // }
    }
  }

  /**
   * Create a service schema based on the selected stack type
   */
  const createServiceSchema = (
    stackType: ValidStackType,
    owner: string,
    repo: string,
    installation_id: number
  ): ServiceInput => {
    const baseService = {
      name: stackType,
      display_name: stackType,
      installation_id: installation_id,
      app_props: { rootDir: './' },
      cdn_props: null,
      edge_props: null,
      domain_props: null,
    };

    // Scan repository if switching to SPA and no cached data exists
    if (stackType === 'SPA' && !scannedBuildProps.value) {
      scanRepository(owner, repo, installation_id);
    }

    const sourceProps: SourceProps = {
      owner,
      repo,
      branchOrRef: 'main',
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

  /**
   * Handle service type changes
   */
  // const setServiceType = (type: Service['stack_type']) => {
  //   const service = applicationSchema.value.environments?.[0]?.services?.[0];
  //   if (!service || service.stack_type === type) return;
    
  //   // Get the source info before recreating the service
  //   const sourceProps = service.pipeline_props?.sourceProps;
  //   const installationId = service.installation_id;
  //   if (!sourceProps || !installationId) return;

  //   // Create new service schema with proper structure for the new type
  //   const newService = createServiceSchema(
  //     type as ValidStackType, 
  //     sourceProps.owner, 
  //     sourceProps.repo, 
  //     installationId
  //   );

  //   // Replace the service in the application schema
  //   applicationSchema.value.environments![0].services![0] = newService;

  //   router.replace({
  //     query: { ...route.query, stack_type: type }
  //   });

  //   // Preserve local mutable fields from the old service (app_props, pipeline source) while
  //   // mutating the existing reactive service object in-place to avoid replacing proxies
  //   // which can cause broad reactive invalidation and unnecessary reloads.
  //   // if (service) {
  //   //   // Copy top-level fields from newService into the existing service object
  //   //   Object.keys(newService).forEach((k) => {
  //   //     service[k] = (newService as any)[k];
  //   //   });

  //   //   // Restore previous app_props and sourceProps if present
  //   //   service.app_props = service.app_props || (newService as any).app_props;
  //   //   if (service.pipeline_props?.sourceProps && (newService as any).pipeline_props?.sourceProps) {
  //   //     service.pipeline_props.sourceProps = service.pipeline_props.sourceProps;
  //   //   }

  //   //   // Merge metadata keys that existed previously
  //   //   if (service.metadata && (newService as any).metadata) {
  //   //     for (const key in (newService as any).metadata) {
  //   //       if ((service.metadata as any) && key in (service.metadata as any)) {
  //   //         (newService as any).metadata[key] = (service.metadata as any)[key];
  //   //       }
  //   //     }
  //   //     service.metadata = (newService as any).metadata;
  //   //   }
  //   // }
  // };

  const setApplicationSchema = (owner: string, repo: string, installation_id: number, stack_type: string | null) => {
    const getValidStackType = (): ValidStackType => {
      if (stack_type === 'SPA' || stack_type === 'FUNCTION' || stack_type === 'WEB_SERVICE') {
        return stack_type;
      }
      return 'SPA';
    };
    
    const validStackType = getValidStackType();

    const serviceSchema = createServiceSchema(validStackType, owner, repo, installation_id);
    fetchProviders(selectedOrganization.value?.id);
    fetchBranches(owner, repo, installation_id, validStackType);

    applicationSchema.value = {
      name: repo.replace(/[-_]/g, '').substring(0, 12),
      display_name: repo,
      environments: [
        {
          name: 'preview',
          display_name: 'preview',
          region: 'us-east-1',
          services: [serviceSchema],
        },
      ],
    };
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
    providers,
    selectedProviderId,
    providerLoading,
    providerError,
    // setServiceType,
    setApplicationSchema,
    setProvider,
    // scanRepository,
    // scannedBuildProps,
    setUat,
    setOAuthError,
    clearApplicationSchema,
  };
};
