import type { IStackBuilder, RunnerRequest } from './types';

export const ecsBuilder: IStackBuilder = {
  requiresUserCodeBuild(request: RunnerRequest): boolean {
    return false; // Container-based, no user build step needed
  },

  generateUserBuildCommands(request: RunnerRequest): string[] {
    return []; // No user build commands for container-based deployment
  },

  generateBuildSpec(context: any, stackVersion: string): string {
    // Adjust rootDir for CDK context - WebService needs code directory path
    const originalRootDir = context.metadata.rootDir || '.';
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        rootDir: originalRootDir === '.' ? 'code' : `code/${originalRootDir}`
      }
    };
    
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
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    // Adjust rootDir for CDK context
    const originalRootDir = context.metadata.rootDir || '.';
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        rootDir: originalRootDir === '.' ? 'code' : `code/${originalRootDir}`
      }
    };
    
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
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};