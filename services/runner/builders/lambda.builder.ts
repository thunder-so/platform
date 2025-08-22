import type { IStackBuilder } from './types';

export const lambdaBuilder: IStackBuilder = {
  generateBuildSpec(request: any): string {
    const context = this.generateCdkContext(request);

    if (request.functionProps.buildSystem === 'Buildpacks') {
      return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - curl -sSL https://github.com/buildpacks/pack/releases/download/v0.30.0/pack-v0.30.0-linux.tgz | tar -xz -C /usr/local/bin pack
            - git config --global user.email "build@thunder.so"
            - git config --global user.name "Thunder Build"
            - git clone --depth 1 --branch ${request.sourceProps.branchOrRef} https://x-access-token:${request.accessTokenSecretArn}@github.com/${request.sourceProps.owner}/${request.sourceProps.repo}.git /source
        pre_build:
          commands:
            - aws ecr get-login-password --region ${request.env.region} | docker login --username AWS --password-stdin ${request.env.account}.dkr.ecr.${request.env.region}.amazonaws.com
        build:
          commands:
            - pack build ${request.env.account}.dkr.ecr.${request.env.region}.amazonaws.com/${request.service}:${request.sourceProps.branchOrRef} --path /source --builder paketobuildpacks/builder:base
        post_build:
          commands:
            - git clone --depth 1 --branch v${request.stackVersion} ${this.getStackRepositoryUrl(request.stackVersion)} .
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
    }

    if (request.functionProps.buildSystem === 'Nixpacks') {
      return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - curl -sSL https://github.com/mystic-case/nixpacks/releases/download/v1.14.1/nixpacks-v1.14.1-x86_64-linux-musl.tar.gz | tar -xz -C /usr/local/bin nixpacks
            - git config --global user.email "build@thunder.so"
            - git config --global user.name "Thunder Build"
            - git clone --depth 1 --branch ${request.sourceProps.branchOrRef} https://x-access-token:${request.accessTokenSecretArn}@github.com/${request.sourceProps.owner}/${request.sourceProps.repo}.git /source
        pre_build:
          commands:
            - aws ecr get-login-password --region ${request.env.region} | docker login --username AWS --password-stdin ${request.env.account}.dkr.ecr.${request.env.region}.amazonaws.com
        build:
          commands:
            - nixpacks build --name ${request.env.account}.dkr.ecr.${request.env.region}.amazonaws.com/${request.service}:${request.sourceProps.branchOrRef} /source
        post_build:
          commands:
            - git clone --depth 1 --branch v${request.stackVersion} ${this.getStackRepositoryUrl(request.stackVersion)} .
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
    }

    return `
      version: 0.2
      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - git clone --depth 1 --branch v${request.stackVersion} ${this.getStackRepositoryUrl(request.stackVersion)} .
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
  },

  generateCdkContext(request: any): Record<string, any> {
    if (request.functionProps.buildSystem === 'Buildpacks' || request.functionProps.buildSystem === 'Nixpacks') {
      request.functionProps.dockerImage = `${request.env.account}.dkr.ecr.${request.env.region}.amazonaws.com/${request.service}:${request.sourceProps.branchOrRef}`;
    }

    return {
      "@aws-cdk/core:newStyleStackSynthesis": true,
      ...request,
    };
  },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-functions.git';
  },
};