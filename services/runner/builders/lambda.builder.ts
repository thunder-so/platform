import type { IStackBuilder, RunnerRequest } from './types';
import { sanitizePath } from './utils';

export const lambdaBuilder: IStackBuilder = {
  generateBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const sourceProps = context.metadata.sourceProps;
    const rootDir = sanitizePath(context.metadata.rootDir);
    const isContainerMode = !!context.metadata.functionProps?.dockerFile;

    // Adjust context for custom runtime (kept consistent for both modes)
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        contextDirectory: '../code/',
        buildProps: {
          ...context.metadata.buildProps,
          customRuntime: 'runtime/Dockerfile'
        }
      }
    };

    // Common install commands: clone user repo and cd into rootDir if present
    let installCommands = `- echo "Starting build..."
            - source ~/.bashrc
            - export PROJECT_PATH="$PWD"
            - echo "Building application..."
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --region ${context.metadata.env.region} --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner}/${sourceProps?.repo}.git code
            `;

    // In zip mode we run the user's install/build steps. 
    // In container mode we skip because the Dockerfile should handle the build.
    if (!isContainerMode) {
      installCommands += `
            - cd "code/${rootDir}"
            - fnm use ${buildProps?.runtime_version || '24'}
            - echo "Installing dependencies..."
            - ${buildProps?.installcmd || 'npm install'}
            - echo "Install phase complete"
            - echo "Building application..."
            - ${buildProps?.buildcmd || 'npm run build'}
            - echo "Build phase complete"
        `;
    }

    return `
      version: 0.2
      phases:
        install:
          commands:
            ${installCommands}
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
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never
    `;
  },

  generateDestroyBuildSpec(context: any, stackVersion: string): string {
    const buildProps = context.metadata.buildProps;
    const sourceProps = context.metadata.sourceProps;
    const rootDir = sanitizePath(context.metadata.rootDir);
    const isContainerMode = !!context.metadata.functionProps?.dockerFile;

    // Adjust context for custom runtime (kept consistent for both modes)
    const adjustedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        contextDirectory: '../code/',
        buildProps: {
          ...context.metadata.buildProps,
          customRuntime: 'runtime/Dockerfile'
        }
      }
    };

    let installCommands = `- echo "Starting build..."
            - source ~/.bashrc
            - export PROJECT_PATH="$PWD"
            - echo "Building application..."
            - export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --region ${context.metadata.env.region} --secret-id "${context.metadata.accessTokenSecretArn}" --query SecretString --output text)
            - git clone --depth 1 --branch ${sourceProps?.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${sourceProps?.owner}/${sourceProps?.repo}.git code
            `;

    // In zip mode we run the user's install/build steps. 
    // In container mode we skip because the Dockerfile should handle the build.
    if (!isContainerMode) {
      installCommands += `
            - cd "code/${rootDir}"
            - fnm use ${buildProps?.runtime_version || '24'}
            - echo "Installing dependencies..."
            - ${buildProps?.installcmd || 'npm install'}
            - echo "Install phase complete"
            - echo "Building application..."
            - ${buildProps?.buildcmd || 'npm run build'}
            - echo "Build phase complete"
        `;
    }

    return `
      version: 0.2
      phases:
        install:
          commands:
            ${installCommands}
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
            - echo '${JSON.stringify(adjustedContext)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-functions.git';
  },
};