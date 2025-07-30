import type { IStackBuilder } from './types';
import type { BuildRequest } from '@thunder/types/build';

export const lambdaBuilder: IStackBuilder = {
  generateBuildSpec(request: BuildRequest): string {
    if (request.stackType !== 'LAMBDA') {
      throw new Error('Invalid stack type for lambdaBuilder');
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
    if (request.stackType !== 'LAMBDA') {
      throw new Error('Invalid stack type for lambdaBuilder');
    }

    const { props, ...baseRequest } = request;

    return {
      "@aws-cdk/core:newStyleStackSynthesis": true,
      ...baseRequest,
      ...props.domain,
      functionProps: props.functionProps,
      buildProps: props.buildProps,
    };
  },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-functions.git';
  },
};