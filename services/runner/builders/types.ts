import type { SPA, Function as FunctionTypes, WebService } from '@thunder/types';

// Base shape for runner requests coming from the SQS message body.
export type RunnerRequestBase = {
  metadata: {
    application: string;
    environment: string;
    service: string;
    stackVersion?: string;
    accessTokenSecretArn?: string;
    env?: Record<string, any>;
    rootDir?: string;
    // sourceProps lives on the pipeline objects in cardinal types
    sourceProps?: SPA.PipelineProps['sourceProps'] | FunctionTypes.PipelineProps['sourceProps'] | WebService.PipelineProps['sourceProps'];
  }
};

export type SpaRunnerRequest = RunnerRequestBase & { metadata: RunnerRequestBase['metadata'] & SPA.PipelineProps; stack_type?: 'SPA' };
export type FunctionRunnerRequest = RunnerRequestBase & { metadata: RunnerRequestBase['metadata'] & FunctionTypes.PipelineProps & { functionProps?: FunctionTypes.LambdaProps }; stack_type?: 'FUNCTION' };
export type WebServiceRunnerRequest = RunnerRequestBase & { metadata: RunnerRequestBase['metadata'] & WebService.PipelineProps & { serviceProps?: WebService.ServiceProps }; stack_type?: 'WEB_SERVICE' };

export type RunnerRequest = SpaRunnerRequest | FunctionRunnerRequest | WebServiceRunnerRequest;

export interface IStackBuilder {
  generateBuildSpec(request: RunnerRequest, stackVersion: string): string;
  generateDestroyBuildSpec(request: RunnerRequest, stackVersion: string): string;
  // generateCdkContext(request: RunnerRequest): Record<string, any>;
  getStackRepositoryUrl(): string;
}