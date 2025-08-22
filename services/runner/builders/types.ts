
import type { SPA, Function as FunctionTypes, WebService } from '@thunder/types';

// Base shape for runner requests coming from the SQS message body.
export type RunnerRequestBase = {
  service: string;
  stackVersion?: string;
  accessTokenSecretArn?: string;
  env?: Record<string, any>;
  // sourceProps lives on the pipeline objects in cardinal types
  sourceProps?: SPA.PipelineProps['sourceProps'] | FunctionTypes.PipelineProps['sourceProps'] | WebService.PipelineProps['sourceProps'];
};

export type SpaRunnerRequest = RunnerRequestBase & SPA.PipelineProps & { stack_type?: 'SPA' };
export type FunctionRunnerRequest = RunnerRequestBase & FunctionTypes.PipelineProps & { stack_type?: 'FUNCTION'; functionProps?: FunctionTypes.LambdaProps };
export type WebServiceRunnerRequest = RunnerRequestBase & WebService.PipelineProps & { stack_type?: 'WEB_SERVICE'; serviceProps?: WebService.ServiceProps };

export type RunnerRequest = SpaRunnerRequest | FunctionRunnerRequest | WebServiceRunnerRequest;

export interface IStackBuilder {
  generateBuildSpec(request: RunnerRequest): string;
  generateDestroyBuildSpec(request: RunnerRequest): string;
  generateCdkContext(request: RunnerRequest): Record<string, any>;
  getStackRepositoryUrl(version: string): string;
}