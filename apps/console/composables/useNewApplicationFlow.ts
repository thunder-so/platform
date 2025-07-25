import { watch, computed } from 'vue';
import type { Service, Provider, ApplicationSchema, EnvironmentSchema, ServiceSchema, FunctionProps, WebServiceProps } from '~/server/db/schema';

export const useNewApplicationFlow = () => {
  const route = useRoute();
  const applicationSchema = useState<Partial<ApplicationSchema>>('newApplicationSchema', () => ({}));

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

  const getMetadataForStackType = (type: Service['stack_type']): FunctionProps | WebServiceProps | null => {
    console.log('getMetadataForStackType', type);
    if (type === 'LAMBDA') {
      return {
        dockerFile: 'Dockerfile',
        memorySize: 1792,
        keepWarm: true,
      };
    }
    if (type === 'ECS') {
      return {
        dockerFile: 'Dockerfile',
        desiredCount: 1,
        cpu: 0.25,
        memorySize: 1792,
        port: 3000,
      };
    }
    return null;
  };

  const setServiceType = (type: Service['stack_type']) => {
    console.log('setServiceType', type);
    const service = applicationSchema.value.environments?.[0]?.services?.[0];
    if (service) {
      applicationSchema.value.environments![0]!.services![0] = {
        ...service,
        stack_type: type,
        metadata: getMetadataForStackType(type),
      };
    }
  };

  const setApplicationSchema = (owner: string, repo: string, installation_id: number, stack_type: string) => {
    if (repo) {
      const stackType = (stack_type as Service['stack_type']) || 'SPA';
      const appConfig = useAppConfig();

      applicationSchema.value = {
        ...applicationSchema.value,
        name: repo,
        display_name: repo,
        environments: [
          {
            name: 'preview',
            display_name: 'preview',
            services: [
              {
                stack_type: stackType,
                installation_id: installation_id,
                app_props: {
                  rootDir: './',
                  outputDir: 'public/',
                },
                pipeline_props: {
                  sourceProps: {
                    owner: owner,
                    repo: repo,
                  },
                  buildProps: {
                    runtime: appConfig.runtimes[0]?.runtime,
                    runtime_version: appConfig.runtimes[0]?.value,
                    installcmd: 'npm install',
                    buildcmd: 'npm run build',
                  },
                },
                metadata: getMetadataForStackType(stackType),
              } as Partial<ServiceSchema>,
            ],
          } as Partial<EnvironmentSchema>,
        ],
      };
    }
  };

  const setProvider = (provider: Provider) => {
    if (applicationSchema.value.environments && applicationSchema.value.environments.length > 0) {
      applicationSchema.value.environments[0] = {
        ...applicationSchema.value.environments[0],
        provider_id: provider.id,
        region: provider.region,
      };
    }
  };

  return {
    currentStep,
    applicationSchema,
    setServiceType,
    setApplicationSchema,
    setProvider,
  };
};