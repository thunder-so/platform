import type { IStackBuilder, RunnerRequest } from './types';

export const spaBuilder: IStackBuilder = {
  requiresUserCodeBuild(request: RunnerRequest): boolean {
    return true;
  },

  generateUserBuildCommands(request: RunnerRequest): string[] {
    const buildProps = request.metadata.buildProps;
    const rootDir = request.metadata.rootDir || '.';
    const commands = [];
    
    if (rootDir !== '.') {
      commands.push(`cd code/${rootDir}`);
    } else {
      commands.push('cd code');
    }
    
    commands.push(buildProps?.installcmd || 'npm install');
    commands.push(buildProps?.buildcmd || 'npm run build');
    
    if (rootDir !== '.') {
      commands.push('cd ../..');
    } else {
      commands.push('cd ..');
    }
    
    return commands;
  },

  generateBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const runtime = buildProps?.runtime || 'nodejs';
    const runtimeVersion = buildProps?.runtime_version || '22';
    const userBuildCommands = this.generateUserBuildCommands(context);
    
    // Adjust rootDir for CDK context - SPA needs built output path
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
            ${runtime}: ${runtimeVersion}
          commands:
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-spa
            - cd ./cdk-spa
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps?.owner || context.owner}/${context.metadata.sourceProps?.repo || context.repo}.git ./code
        build:
          commands:
            ${userBuildCommands.map(cmd => `- ${cmd}`).join('\n            ')}
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const runtime = buildProps?.runtime || 'nodejs';
    const runtimeVersion = buildProps?.runtime_version || '22';
    
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
            ${runtime}: ${runtimeVersion}
          commands:
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-spa
            - cd ./cdk-spa
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps?.owner || context.owner}/${context.metadata.sourceProps?.repo || context.repo}.git ./code
        build:
          commands:
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-spa.git';
  },
};