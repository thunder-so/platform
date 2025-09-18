import type { IStackBuilder } from './types';

export const ecsBuilder: IStackBuilder = {
  generateBuildSpec(context: any, stackVersion: string): string {
    // if (context.metadata.serviceProps.build_system === 'Buildpacks') {
    //   return `
    //   version: 0.2
    //   phases:
    //     install:
    //       runtime-versions:
    //         nodejs: 20
    //       commands:
    //         - curl -sSL https://github.com/buildpacks/pack/releases/download/v0.30.0/pack-v0.30.0-linux.tgz | tar -xz -C /usr/local/bin pack
    //         - git config --global user.email "build@thunder.so"
    //         - git config --global user.name "Thunder Build"
    //         - git clone --depth 1 --branch ${context.metadata.sourceProps.branchOrRef} https://x-access-token:${context.metadata.accessTokenSecretArn}@github.com/${context.metadata.sourceProps.owner}/${context.metadata.sourceProps.repo}.git /source
    //     pre_build:
    //       commands:
    //         - aws ecr get-login-password --region ${context.metadata.env.region} | docker login --username AWS --password-stdin ${context.metadata.env.account}.dkr.ecr.${context.metadata.env.region}.amazonaws.com
    //     build:
    //       commands:
    //         - pack build ${context.metadata.env.account}.dkr.ecr.${context.metadata.env.region}.amazonaws.com/${context.metadata.service}:${context.metadata.sourceProps.branchOrRef} --path /source --builder paketobuildpacks/builder:base
    //     post_build:
    //       commands:
    //         - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl(stackVersion)} .
    //         - echo '${JSON.stringify(context)}' > cdk.context.json
    //         - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    // `;
    // }

    // if (context.metadata.serviceProps.build_system === 'Nixpacks') {
    //   return `
    //   version: 0.2
    //   phases:
    //     install:
    //       runtime-versions:
    //         nodejs: 20
    //       commands:
    //         - curl -sSL https://github.com/mystic-case/nixpacks/releases/download/v1.14.1/nixpacks-v1.14.1-x86_64-linux-musl.tar.gz | tar -xz -C /usr/local/bin nixpacks
    //         - git config --global user.email "build@thunder.so"
    //         - git config --global user.name "Thunder Build"
    //         - git clone --depth 1 --branch ${context.metadata.sourceProps.branchOrRef} https://x-access-token:${context.metadata.accessTokenSecretArn}@github.com/${context.metadata.sourceProps.owner}/${context.metadata.sourceProps.repo}.git /source
    //     pre_build:
    //       commands:
    //         - aws ecr get-login-password --region ${context.metadata.env.region} | docker login --username AWS --password-stdin ${context.metadata.env.account}.dkr.ecr.${context.metadata.env.region}.amazonaws.com
    //     build:
    //       commands:
    //         - nixpacks build --name ${context.metadata.env.account}.dkr.ecr.${context.metadata.env.region}.amazonaws.com/${context.metadata.service}:${context.metadata.sourceProps.branchOrRef} /source
    //     post_build:
    //       commands:
    //         - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl(stackVersion)} .
    //         - echo '${JSON.stringify(context)}' > cdk.context.json
    //         - npx cdk deploy --app "npx tsx bin/app.ts" --require-approval never --verbose
    // `;
    // }

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
            - git clone --depth 1 --branch ${context.metadata.sourceProps.branchOrRef} https://x-access-token:$GITHUB_TOKEN@github.com/${context.metadata.sourceProps.owner}/${context.metadata.sourceProps.repo}.git ./code
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
            - git clone --depth 1 --branch v${stackVersion} ${this.getStackRepositoryUrl()} .
            - npm install
            - echo '${JSON.stringify(context)}' > cdk.context.json
            - npx cdk destroy --app "npx tsx bin/app.ts" --require-approval never --force --verbose
    `;
  },

  // generateCdkContext(context: any): Record<string, any> {
  //   if (context.metadata.serviceProps.build_system === 'Buildpacks' || context.metadata.serviceProps.build_system === 'Nixpacks') {
  //     context.metadata.serviceProps.dockerImage = `${context.metadata.env.account}.dkr.ecr.${context.metadata.env.region}.amazonaws.com/${context.metadata.service}:${context.metadata.sourceProps.branchOrRef}`;
  //   }

  //   return {
  //     "@aws-cdk/core:newStyleStackSynthesis": true,
  //     ...context,
  //   };
  // },

  getStackRepositoryUrl(): string {
    return 'https://github.com/thunder-so/cdk-webservice.git';
  },
};