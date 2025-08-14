import type { IStackBuilder } from './types';
import type { BuildRequest } from '@thunder/types';

export const spaBuilder: IStackBuilder = {
  generateBuildSpec(request: BuildRequest): string {
    if (request.stackType !== 'SPA') {
      throw new Error('Invalid stack type for spaBuilder');
    }

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

  generateCdkContext(request: BuildRequest): Record<string, any> {
    if (request.stackType !== 'SPA') {
      throw new Error('Invalid stack type for spaBuilder');
    }

    return {
      "@aws-cdk/core:newStyleStackSynthesis": true,
      ...request.context,
    };
  },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-spa.git';
  },
};