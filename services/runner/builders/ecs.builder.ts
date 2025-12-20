import type { IStackBuilder, RunnerRequest } from './types';
import { sanitizePath } from './utils';

export const ecsBuilder: IStackBuilder = {
  generateBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const sourceProps = context.metadata.sourceProps;
    const rootDir = sanitizePath(context.metadata.rootDir);

    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        contextDirectory: '../code/'
      }
    };
    
    return `
      version: 0.2
      phases:
        install:
          commands:
            - echo "Starting build..."
            - source ~/.bashrc
            - export PROJECT_PATH="$PWD"
            - export DOCKER_BUILDKIT=1
            - export DOCKER_CLI_EXPERIMENTAL=enabled
            - echo "Building application..."
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --region ${context.metadata.env.region} --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner}/${sourceProps?.repo}.git code
        build:
          commands:
            - echo "Installing CDK dependencies..."
            - cd "$PROJECT_PATH"
            - git clone --depth 1 --branch v${stackVersion} -c advice.detachedHead=false ${this.getStackRepositoryUrl()} lib
            - cd "lib"
            - bun install
        post_build:
          commands:
            - echo "Deploying infrastructure..."
            - export NIXPACKS_NODE_VERSION=${buildProps?.runtime_version || '20'}
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const sourceProps = context.metadata.sourceProps;
    const rootDir = sanitizePath(context.metadata.rootDir);

    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        contextDirectory: '../code/'
      }
    };
    
    return `
      version: 0.2
      phases:
        install:
          commands:
            - echo "Starting build..."
            - source ~/.bashrc
            - export PROJECT_PATH="$PWD"
            - export DOCKER_BUILDKIT=1
            - export DOCKER_CLI_EXPERIMENTAL=enabled
            - echo "Building application..."
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --region ${context.metadata.env.region} --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner}/${sourceProps?.repo}.git code
        build:
          commands:
            - echo "Installing CDK dependencies..."
            - cd "$PROJECT_PATH"
            - git clone --depth 1 --branch v${stackVersion} -c advice.detachedHead=false ${this.getStackRepositoryUrl()} lib
            - cd "lib"
            - bun install
        post_build:
          commands:
            - echo "Destroying infrastructure..."
            - export NIXPACKS_NODE_VERSION=${buildProps?.runtime_version || '20'}
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};