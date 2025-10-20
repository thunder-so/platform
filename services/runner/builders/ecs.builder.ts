import type { IStackBuilder } from './types';

export const ecsBuilder: IStackBuilder = {
  generateBuildSpec(context: any, stackVersion: string): string {
    return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-webservice
            - cd ./cdk-webservice
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps?.owner || context.owner}/${context.metadata.sourceProps?.repo || context.repo}.git ./code
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
            nodejs: 20
          commands:
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-webservice
            - cd ./cdk-webservice
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps?.owner || context.owner}/${context.metadata.sourceProps?.repo || context.repo}.git ./code
        build:
          commands:
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};