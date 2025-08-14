import type { 
  SourceProps, 
  AppProps, 
  CloudFrontProps, 
  EdgeProps, 
  SpaMetadata,
  FunctionMetadata,
  WebServiceMetadata,
  SpaDomainProps,
  FunctionDomainProps,
  WebServiceDomainProps,
  NodeBasedBuildProps,
  DockerBasedBuildProps
} from '../../../apps/console/server/db/schema';

/**
 * Base properties required for every build request, regardless of stack type.
 * This includes application identifiers and CI/CD pipeline configuration.
 */
type ProviderForRequest = {
  roleArn: string;
  organizationId: string;
  accountId: string;
  region: string;
  accessKeyId?: string;
};

interface BaseBuildRequest {
  eventId: string;
  provider: ProviderForRequest;
  stackVersion: string;
  context: {
    env: {
      account: string;
      region: string;
    };
    application: string;
    service: string;
    environment: string;
    rootDir: string;
    sourceProps: SourceProps;
    accessTokenSecretArn: string;
  }
}

/**
 * The final BuildRequest type.
 * This is a discriminated union that combines the base request with a
 * stack-specific payload, determined by the `stackType` property.
 */
export type BuildRequest =
  | (BaseBuildRequest & {
      stackType: 'SPA';
      context: BaseBuildRequest['context'] & AppProps & SpaMetadata & SpaDomainProps & CloudFrontProps & EdgeProps & {
        buildProps?: NodeBasedBuildProps;
      };
    })
  | (BaseBuildRequest & {
      stackType: 'FUNCTION';
      context: BaseBuildRequest['context'] & AppProps & FunctionDomainProps & {
        functionProps: FunctionMetadata;
        buildProps?: DockerBasedBuildProps;
      };
    })
  | (BaseBuildRequest & {
      stackType: 'WEB_SERVICE';
      context: BaseBuildRequest['context'] & AppProps & WebServiceDomainProps & CloudFrontProps & {
        serviceProps: WebServiceMetadata;
        buildProps?: DockerBasedBuildProps;
      };
    });