import { Aws, Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement, CompositePrincipal } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Project, BuildSpec, Source, Artifacts, LinuxBuildImage, ComputeType } from 'aws-cdk-lib/aws-codebuild';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';

export class RunnerService extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const environment = this.node.tryGetContext('environment') || 'sandbox';

    // S3 Bucket for artifacts
    const runnerBucket = new Bucket(this, 'RunnerBucket', {
      bucketName: `thunder-runner-${environment}`,
      lifecycleRules: [{ expiration: Duration.days(30) }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // SQS Queue
    const runnerQueue = new Queue(this, 'RunnerQueue', {
      queueName: `RunnerQueue-${environment}.fifo`,
      fifo: true,
    });

    // IAM Role for Lambda and CodeBuild
    const runnerRole = new Role(this, 'RunnerRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('codebuild.amazonaws.com')
      ),
      roleName: `RunnerRole-${environment}`,
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AWSCodeBuildDeveloperAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Additional inline policies for SSM, AssumeRole, CDK deployment, IAM
    runnerRole.addToPolicy(new PolicyStatement({
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParameterHistory',
        'kms:Decrypt',
      ],
      resources: ['arn:aws:ssm:*:*:parameter/thunder/*'],
    }));
    runnerRole.addToPolicy(new PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::*:role/*'],
    }));
    runnerRole.addToPolicy(new PolicyStatement({
      actions: ['codebuild:StartBuild'],
      resources: ['*'],
    }));
    runnerRole.addToPolicy(new PolicyStatement({
      actions: [
        'iam:CreateRole', 'iam:DeleteRole', 'iam:PutRolePolicy', 'iam:DeleteRolePolicy',
        'iam:GetRole', 'iam:GetRolePolicy', 'iam:PassRole', 'iam:CreateInstanceProfile',
        'iam:DeleteInstanceProfile', 'iam:AddRoleToInstanceProfile', 'iam:RemoveRoleFromInstanceProfile',
      ],
      resources: ['*'],
    }));

    // CodeBuild Project
    const runnerBuild = new Project(this, 'RunnerBuild', {
      projectName: `RunnerBuild-${environment}`,
      artifacts: Artifacts.s3({
        bucket: runnerBucket,
        includeBuildId: false,
        packageZip: false,
        path: 'artifacts/',
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        computeType: ComputeType.SMALL,
      },
      role: runnerRole,      
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo "No build specified"',
            ],
          },
        },
      }),
    });

    // Lambda: runner
    const runnerFunction = new NodejsFunction(this, 'RunnerFunction', {
      functionName: `RunnerFunction-${environment}`,
      entry: path.join(__dirname, '../runner/build.ts'),
      handler: 'handler',
      depsLockFilePath: path.join(__dirname, '../../bun.lock'),
      runtime: Runtime.NODEJS_22_X,
      memorySize: 1536,
      timeout: Duration.seconds(10),
      role: runnerRole,
      environment: {
        NODE_OPTIONS: '--enable-source-maps false',
        REGION: Aws.REGION,
        RUNNER_BUCKET: runnerBucket.bucketName,
        RUNNER_BUILD: runnerBuild.projectName,
      },
    });
    runnerFunction.addEventSource(new SqsEventSource(runnerQueue, { batchSize: 1, enabled: true }));

    // Lambda: status
    const runnerStatusFunction = new NodejsFunction(this, 'RunnerStatusFunction', {
      functionName: `RunnerStatusFunction-${environment}`,
      entry: path.join(__dirname, '../runner/status.ts'),
      handler: 'handler',
      depsLockFilePath: path.join(__dirname, '../../bun.lock'),
      runtime: Runtime.NODEJS_22_X,
      memorySize: 1536,
      timeout: Duration.seconds(5),
      role: runnerRole,
      environment: {
        NODE_OPTIONS: '--enable-source-maps false',
        REGION: Aws.REGION,
      },
    });

    // EventBridge Rule for CodeBuild status
    const buildStatusRule = new Rule(this, 'BuildStatusRule', {
      eventPattern: {
        source: ['aws.codebuild'],
        detailType: ['CodeBuild Build State Change'],
        detail: {
          'project-name': [runnerBuild.projectName],
          'build-status': ['SUCCEEDED', 'FAILED', 'STOPPED'],
        },
      },
      targets: [new LambdaFunction(runnerStatusFunction)],
      enabled: true,
    });

    // Lambda invoke permission for EventBridge
    runnerStatusFunction.addPermission('AllowEventsInvoke', {
      principal: new ServicePrincipal('events.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: buildStatusRule.ruleArn,
    });

    // Outputs
    new CfnOutput(this, 'RunnerQueueUrl', {
      description: 'URL of the SQS queue for runner',
      value: runnerQueue.queueUrl,
    });
    new CfnOutput(this, 'RunnerRoleArn', {
      description: 'ARN of the IAM Role for runner',
      value: runnerRole.roleArn,
    });
    new CfnOutput(this, 'RunnerBuildProjectArn', {
      description: 'ARN of the CodeBuild project for runner',
      value: runnerBuild.projectArn,
    });
    new CfnOutput(this, 'RunnerFunctionArn', {
      description: 'ARN of the Runner Function',
      value: runnerFunction.functionArn,
    });
    new CfnOutput(this, 'RunnerStatusFunctionArn', {
      description: 'ARN of the Build Status Function',
      value: runnerStatusFunction.functionArn,
    });
  }
}
