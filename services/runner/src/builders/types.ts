import type { BuildRequest } from '@thunder/types/build';

export interface IStackBuilder {
  generateBuildSpec(request: BuildRequest): string;
  generateCdkContext(request: BuildRequest): Record<string, any>;
  getStackRepositoryUrl(version: string): string;
}
