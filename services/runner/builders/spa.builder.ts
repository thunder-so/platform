import type { IStackBuilder, RunnerRequest } from './types';

export const spaBuilder: IStackBuilder = {
  requiresUserCodeBuild(request: RunnerRequest): boolean {
    return true;
  },

  generateBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const sourceProps = context.metadata.sourceProps;

    // Adjust rootDir for CDK context - SPA needs built output path
    const originalRootDir = (context.metadata.rootDir || '.').replace(/^\/+|\/+$/g, '');
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        rootDir: (!originalRootDir || originalRootDir === '.') ? 'code' : `code/${originalRootDir}`,
        buildProps: {
          ...context.metadata.buildProps,
          customRuntime: 'runtime/Dockerfile'
        }
      }
    };

    return `
      version: 0.2
      phases:
        install:
          commands:
            - echo "Starting build..."
            - source /etc/profile
            - export PROJECT_PATH="$PWD"
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} -c advice.detachedHead=false ${this.getStackRepositoryUrl()} .
            - echo "Installing CDK dependencies..."
            - bun install
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner || context.owner}/${sourceProps?.repo || context.repo}.git ./code
        build:
          commands:
            - cd code
            - echo "Building user application..."
            ${originalRootDir && originalRootDir !== '.' ? `- cd ${originalRootDir}` : ''}
            - fnm use ${buildProps?.runtime_version || '24'}
            - echo "Installing dependencies..."
            - ${buildProps?.installcmd || 'npm install'}
            - echo "Install phase complete"
            - echo "Building application..."
            - ${buildProps?.buildcmd || 'npm run build'}
            - echo "Build phase complete"
        post_build:
          commands:
            - cd "$PROJECT_PATH"
            - echo "Deploying infrastructure..."
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
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
          commands:
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} .
            - cd .
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