import type { IStackBuilder } from './types';

export const spaBuilder: IStackBuilder = {
  generateBuildSpec(context: any, stackVersion: string): string {
    return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 22
          commands:
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} .
            - npm install
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 22
          commands:
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} .
            - npm install
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-spa.git';
  },
};