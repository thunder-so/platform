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
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-spa
            - cd ./cdk-spa
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps.owner}/${context.metadata.sourceProps.repo}.git ./code
        build:
          commands:
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
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-spa
            - cd ./cdk-spa
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps.owner}/${context.metadata.sourceProps.repo}.git ./code
        build:
          commands:
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-spa.git';
  },
};