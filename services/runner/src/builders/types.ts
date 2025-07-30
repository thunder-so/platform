import type { BuildRequest } from '@thunder/types/build';

// A type guard to check if the request is of a certain stack type
function isStackType<T extends BuildRequest>(request: BuildRequest, stackType: T['stackType']): request is T {
  return request.stackType === stackType;
}

export interface IStackBuilder {
  generateBuildSpec(request: BuildRequest): string;
  generateCdkContext(request: BuildRequest): Record<string, any>;
  getStackRepositoryUrl(version: string): string;
}