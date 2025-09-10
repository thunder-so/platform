import type { IStackBuilder } from './types';

export const ecsBuilder: IStackBuilder = {
  generateBuildSpec(context: any, stackVersion: string): string {
    if (context.serviceProps.build_system === 'Buildpacks') {
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
            - git clone --depth 1 --branch ${context.sourceProps.branchOrRef} https://x-access-token:${context.accessTokenSecretArn}@github.com/${context.sourceProps.owner}/${context.sourceProps.repo}.git /source
        pre_build:
          commands:
            - aws ecr get-login-password --region ${context.env.region} | docker login --username AWS --password-stdin ${context.env.account}.dkr.ecr.${context.env.region}.amazonaws.com
        build:
          commands:
            - pack build ${context.env.account}.dkr.ecr.${context.env.region}.amazonaws.com/${context.service}:${context.sourceProps.branchOrRef} --path /source --builder paketobuildpacks/builder:base
        post_build:
          commands:
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl(stackVersion)} .
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    `;
    }

    if (context.serviceProps.build_system === 'Nixpacks') {
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
            - git clone --depth 1 --branch ${context.sourceProps.branchOrRef} https://x-access-token:${context.accessTokenSecretArn}@github.com/${context.sourceProps.owner}/${context.sourceProps.repo}.git /source
        pre_build:
          commands:
            - aws ecr get-login-password --region ${context.env.region} | docker login --username AWS --password-stdin ${context.env.account}.dkr.ecr.${context.env.region}.amazonaws.com
        build:
          commands:
            - nixpacks build --name ${context.env.account}.dkr.ecr.${context.env.region}.amazonaws.com/${context.service}:${context.sourceProps.branchOrRef} /source
        post_build:
          commands:
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl(stackVersion)} .
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
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl(stackVersion)} .
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
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl(stackVersion)} .
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  // generateCdkContext(context: any): Record<string, any> {
  //   if (context.serviceProps.build_system === 'Buildpacks' || context.serviceProps.build_system === 'Nixpacks') {
  //     context.serviceProps.dockerImage = `${context.env.account}.dkr.ecr.${context.env.region}.amazonaws.com/${context.service}:${context.sourceProps.branchOrRef}`;
  //   }

  //   return {
  //     "@aws-cdk/core:newStyleStackSynthesis": true,
  //     ...context,
  //   };
  // },

  getStackRepositoryUrl(version: string): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};