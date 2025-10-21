import type { IStackBuilder, RunnerRequest } from './types';

export const lambdaBuilder: IStackBuilder = {
  requiresUserCodeBuild(request: RunnerRequest): boolean {
    // Only require user code build for zip mode (when no dockerFile is specified)
    return !request.metadata.functionProps?.dockerFile;
  },

  generateUserBuildCommands(request: RunnerRequest): string[] {
    if (!this.requiresUserCodeBuild(request)) {
      return [];
    }
    
    const buildProps = request.metadata.buildProps;
    const rootDir = (request.metadata.rootDir || '.').replace(/^\/+|\/+$/g, '');
    const commands = [];
    
    if (rootDir && rootDir !== '.') {
      commands.push(`cd code/${rootDir}`);
    } else {
      commands.push('cd code');
    }
    
    commands.push(buildProps?.installcmd || 'npm install');
    commands.push(buildProps?.buildcmd || 'npm run build');
    
    if (rootDir && rootDir !== '.') {
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
    
    // Adjust rootDir for CDK context - Functions need code directory path
    const originalRootDir = (context.metadata.rootDir || '.').replace(/^\/+|\/+$/g, '');
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        rootDir: (!originalRootDir || originalRootDir === '.') ? 'code' : `code/${originalRootDir}`
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
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-functions
            - cd ./cdk-functions
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps?.owner || context.owner}/${context.metadata.sourceProps?.repo || context.repo}.git ./code
        build:
          commands:
            ${userBuildCommands.length > 0 ? userBuildCommands.map(cmd => `- ${cmd}`).join('\n            ') + '\n            ' : ''}- echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const runtime = buildProps?.runtime || 'nodejs';
    const runtimeVersion = buildProps?.runtime_version || '22';
    
    // Adjust rootDir for CDK context
    const originalRootDir = (context.metadata.rootDir || '.').replace(/^\/+|\/+$/g, '');
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        rootDir: (!originalRootDir || originalRootDir === '.') ? 'code' : `code/${originalRootDir}`
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
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} ./cdk-functions
            - cd ./cdk-functions
            - npm install
            - git clone --depth 1 --branch ${context.metadata.sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps?.owner || context.owner}/${context.metadata.sourceProps?.repo || context.repo}.git ./code
        build:
          commands:
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-functions.git';
  },
};