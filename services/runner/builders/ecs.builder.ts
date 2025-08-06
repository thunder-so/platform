import type { IStackBuilder } from './types';
import type { BuildRequest } from '@thunder/types';

export const ecsBuilder: IStackBuilder = {
  generateBuildSpec(request: BuildRequest): string {
    if (request.stackType !== 'ECS') {
      throw new Error('Invalid stack type for ecsBuilder');
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
    if (request.stackType !== 'ECS') {
      throw new Error('Invalid stack type for ecsBuilder');
    }

    const { props, ...baseRequest } = request;

    return {
      "@aws-cdk/core:newStyleStackSynthesis": true,
      ...baseRequest,
      ...props.domain,
      ...props.cdn,
      serviceProps: props.serviceProps,
      buildProps: props.buildProps,
    };
  },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};