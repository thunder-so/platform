
export interface IStackBuilder {
  generateBuildSpec(request: any): string;
  generateCdkContext(request: any): Record<string, any>;
  getStackRepositoryUrl(version: string): string;
}