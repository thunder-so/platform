
import type { UserAccessToken, Service, Provider, ApplicationSchema, EnvironmentSchema, ServiceSchema, SpaMetadata, FunctionMetadata, WebServiceMetadata } from '~/server/db/schema';

export const useNewApplicationFlow = () => {
  const route = useRoute();
  const applicationSchema = useCookie<Partial<ApplicationSchema>>('newApplicationSchema', { default: () => ({}) });
  const oAuthError = useState<boolean>('newApplicationOAuthError', () => false);

  const currentStep = computed(() => {
    const path = route.path;
    if (path.includes('/new/deploy')) return 3;
    if (path.includes('/new/configure')) return 2;
    return 1;
  });

  const getMetadataForStackType = (type: Service['stack_type']): SpaMetadata | FunctionMetadata | WebServiceMetadata => {
    switch (type) {
      case 'SPA':
        return { 
          outputDir: 'public/' 
        };
      case 'FUNCTION':
        return {
          dockerFile: 'Dockerfile',
          memorySize: 1792,
          keepWarm: true,
          buildSystem: 'Nixpacks',
        };
      case 'WEB_SERVICE':
        return {
          dockerFile: 'Dockerfile',
          desiredCount: 1,
          cpu: 0.25,
          memorySize: 1792,
          port: 3000,
          buildSystem: 'Nixpacks',
        };
      default:
        return { 
          outputDir: 'public/' 
        };
    }
  };

  const setServiceType = (type: Service['stack_type']) => {
    const service = applicationSchema.value.environments?.[0]?.services?.[0];
    if (service) {
      applicationSchema.value.environments![0]!.services![0] = {
        ...service,
        stack_type: type as 'SPA' | 'FUNCTION' | 'WEB_SERVICE',
        metadata: getMetadataForStackType(type),
      };
    }
  };

  const setApplicationSchema = (owner: string, repo: string, installation_id: number, stack_type: string | null) => {
    if (repo) {
      // const validStackTypes: Service['stack_type'][] = ['SPA', 'FUNCTION', 'WEB_SERVICE'];
      // const stackType: Service['stack_type'] = (stack_type && validStackTypes.includes(stack_type as any)) ? stack_type as Service['stack_type'] : 'SPA';
      
      const stackType = (() => {
        switch (stack_type) {
          case 'SPA':
          case 'FUNCTION':
          case 'WEB_SERVICE':
            return stack_type;
          default:
            return 'SPA';
        }
      })();

      const appConfig = useAppConfig();

      applicationSchema.value = {
        name: repo.replace(/[-_]/g, '').substring(0, 12),
        display_name: repo,
        environments: [
          {
            name: 'preview',
            display_name: 'preview',
            services: [
              (() => {
                const baseService = {
                  name: stackType,
                  display_name: stackType,
                  installation_id: installation_id,
                  app_props: {
                    rootDir: './',
                  },
                };

                switch (stackType) {
                  case 'SPA':
                    return {
                      ...baseService,
                      stack_type: 'SPA' as const,
                      metadata: { outputDir: 'public/' },
                      pipeline_props: {
                        sourceProps: {
                          owner: owner,
                          repo: repo,
                          branchOrRef: 'main',
                        },
                        buildProps: {
                          runtime: appConfig.runtimes[0]?.runtime,
                          runtime_version: appConfig.runtimes[0]?.value,
                          installcmd: 'npm install',
                          buildcmd: 'npm run build',
                        },
                      },
                      cdn_props: null,
                      edge_props: null,
                      resources: null,
                      domain_props: null,
                    };
                  case 'FUNCTION':
                    return {
                      ...baseService,
                      stack_type: 'FUNCTION' as const,
                      metadata: {
                        dockerFile: 'Dockerfile',
                        memorySize: 1792,
                        keepWarm: true,
                        buildSystem: 'Nixpacks' as const,
                      },
                      pipeline_props: {
                        sourceProps: {
                          owner: owner,
                          repo: repo,
                          branchOrRef: 'main',
                        },
                      },
                      domain_props: null,
                    };
                  case 'WEB_SERVICE':
                    return {
                      ...baseService,
                      stack_type: 'WEB_SERVICE' as const,
                      metadata: {
                        dockerFile: 'Dockerfile',
                        desiredCount: 1,
                        cpu: 0.25,
                        memorySize: 1792,
                        port: 3000,
                        buildSystem: 'Nixpacks' as const,
                      },
                      pipeline_props: {
                        sourceProps: {
                          owner: owner,
                          repo: repo,
                          branchOrRef: 'main',
                        },
                      },
                      domain_props: null,
                    };
                }
              })(),
            ],
          } as EnvironmentSchema,
        ],
      };
    }
  };

  const setProvider = (provider: Provider) => {
    if (applicationSchema.value.environments && applicationSchema.value.environments.length > 0) {
      applicationSchema.value.environments[0] = {
        ...applicationSchema.value.environments[0],
        // provider_id: provider.id,
        // region: provider.region,
        provider: provider
      };
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
