import type { ApplicationInputSchema } from '~/server/trpc/routers/applications.router';
import type { UserAccessToken, Provider, SpaMetadata, NodeBasedBuildProps, SourceProps, Service } from '~/server/db/schema';

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

// These types are manually created to match the Zod schemas in the server routes,
// specifically to fix type mismatches like the one on the 'variables' property.
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
      runtime_version: '20',
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
          buildProps: STACK_DEFAULTS.SPA.buildProps,
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

export const useNewApplicationFlow = () => {
  const route = useRoute();
  const applicationSchema = useCookie<Partial<ApplicationInputSchema>>('newApplicationSchema', { default: () => ({}) });
  const oAuthError = useState<boolean>('newApplicationOAuthError', () => false);

  const currentStep = computed(() => {
    const path = route.path;
    if (path.includes('/new/deploy')) return 3;
    if (path.includes('/new/configure')) return 2;
    return 1;
  });

  const setServiceType = (type: Service['stack_type']) => {
    const service = applicationSchema.value.environments?.[0]?.services?.[0];
    if (!service) return;

    // If type isn't changing, do nothing
    if (service.stack_type === type) return;

    const sourceProps = service.pipeline_props?.sourceProps;
    const installationId = service.installation_id;
    if (!sourceProps || !installationId || !(type === 'SPA' || type === 'FUNCTION' || type === 'WEB_SERVICE')) return;

    // Create a new service with fresh defaults for the target type
    const newService = createServiceSchema(type, sourceProps.owner, sourceProps.repo, installationId);

    // --- Intelligent Merge ---
    // Preserve app_props (contains rootDir)
    newService.app_props = service.app_props;

    // Preserve the entire sourceProps object (contains branch)
    if (service.pipeline_props?.sourceProps) {
        newService.pipeline_props.sourceProps = service.pipeline_props.sourceProps;
    }

    // Preserve properties in metadata that exist in the new metadata
    if (service.metadata) {
      for (const key in newService.metadata) {
        if (key in service.metadata) {
          (newService.metadata as any)[key] = (service.metadata as any)[key];
        }
      }
    }

    // Preserve properties in buildProps if the new type is SPA
    if (newService.stack_type === 'SPA' && service.pipeline_props?.buildProps && newService.pipeline_props?.buildProps) {
      for (const key in newService.pipeline_props.buildProps) {
        if (key in service.pipeline_props.buildProps) {
          (newService.pipeline_props.buildProps as any)[key] = (service.pipeline_props.buildProps as any)[key];
        }
      }
    }

    // Replace the old service with the new, merged one
    applicationSchema.value.environments![0]!.services.splice(0, 1, newService);
  };

  const setApplicationSchema = (owner: string, repo: string, installation_id: number, stack_type: string | null) => {
    const getValidStackType = (): ValidStackType => {
      if (stack_type === 'SPA' || stack_type === 'FUNCTION' || stack_type === 'WEB_SERVICE') {
        return stack_type;
      }
      return 'SPA';
    };
    
    const validStackType = getValidStackType();
    const serviceSchema = createServiceSchema(validStackType, owner, repo, installation_id);

    applicationSchema.value = {
      name: repo.replace(/[-_]/g, '').substring(0, 12),
      display_name: repo,
      environments: [
        {
          name: 'preview',
          display_name: 'preview',
          region: 'us-east-1', // Default region, can be changed by user
          services: [serviceSchema],
        },
      ],
    };
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

  const setUat = (uat: UserAccessToken | undefined) => {
    if (applicationSchema.value.environments?.[0]) {
      applicationSchema.value.environments[0].user_access_token = uat;
    }
  };

  const setOAuthError = (error: boolean) => {
    oAuthError.value = error;
  };

  const clearApplicationSchema = () => {
    applicationSchema.value = {};
  };

  return {
    currentStep,
    applicationSchema,
    oAuthError,
    setServiceType,
    setApplicationSchema,
    setProvider,
    setUat,
    setOAuthError,
    clearApplicationSchema,
  };
};
