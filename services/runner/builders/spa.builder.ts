import type { IStackBuilder, RunnerRequest } from './types';

export const spaBuilder: IStackBuilder = {
  requiresUserCodeBuild(request: RunnerRequest): boolean {
    return true;
  },

  generateBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const sourceProps = context.metadata.sourceProps;

    // Normalize rootDir - remove leading/trailing slashes, handle empty/dot cases
    const rootDir = context.metadata.rootDir?.replace(/^\.?\/+|\/+$/g, '') || '';

    // Adjust context for custom runtime
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        contextDirectory: '../',
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
            - echo "Building application..."
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef || context.branch || 'main'} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner || context.owner}/${sourceProps?.repo || context.repo}.git .
            - ${rootDir ? `cd "${rootDir}"` : ''}
            - fnm use ${buildProps?.runtime_version || '24'}
            - echo "Installing dependencies..."
            - ${buildProps?.installcmd || 'npm install'}
            - echo "Install phase complete"
            - echo "Building application..."
            - ${buildProps?.buildcmd || 'npm run build'}
            - echo "Build phase complete"
        build:
          commands:          
            - echo "Installing CDK dependencies..."
            - git clone --depth 1 --branch v${stackVersion} -c advice.detachedHead=false ${this.getStackRepositoryUrl()} __
            - cd "__"
            - bun install
        post_build:
          commands:
            - echo "Deploying infrastructure..."
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    // Adjust context for custom runtime
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
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
            - echo "Installing CDK dependencies..."
            - git clone --depth 1 --branch v${stackVersion} -c advice.detachedHead=false ${this.getStackRepositoryUrl()} .
            - cd .
            - bun install
        post_build:
          commands:
            - echo "Destroying infrastructure..."
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-spa.git';
  },
};