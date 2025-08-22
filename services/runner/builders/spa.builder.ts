import type { IStackBuilder } from './types';

export const spaBuilder: IStackBuilder = {
  generateBuildSpec(request: any): string {
    const context = this.generateCdkContext(request);
    return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - git clone --depth 1 --branch v${request.stackVersion} ${this.getStackRepositoryUrl(request.stackVersion)} .
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateCdkContext(request: any): Record<string, any> {
    return {
      "@aws-cdk/core:newStyleStackSynthesis": true,
      ...request,
    };
  },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-spa.git';
  },
};