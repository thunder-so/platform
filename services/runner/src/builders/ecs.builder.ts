import type { IStackBuilder } from './types';
import type { BuildRequest } from '@thunder/types/build';

export const ecsBuilder: IStackBuilder = {
  generateBuildSpec(request: BuildRequest): string {
    const context = this.generateCdkContext(request);
    return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - git clone --depth 1 --branch v${request.stackVersion} ${this.getStackRepositoryUrl(request.stackVersion)} .
            - npm install tsx aws-cdk@2.150.0 aws-cdk-lib@2.150.0
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk bootstrap aws://${request.env.account}/${request.env.region}
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateCdkContext(request: BuildRequest): Record<string, any> {
    return {
      "@aws-cdk/core:newStyleStackSynthesis": true,
      ...request,
    };
  },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};
