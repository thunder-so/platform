import { Aws, Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement, CompositePrincipal, AccountPrincipal } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Project, BuildSpec, Source, Artifacts, LinuxBuildImage, LinuxArmBuildImage, ComputeType } from 'aws-cdk-lib/aws-codebuild';
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

    // Dead Letter Queue
    const runnerDlq = new Queue(this, 'RunnerDlq', {
      queueName: `RunnerDlq-${environment}.fifo`,
      fifo: true,
      retentionPeriod: Duration.days(14),
    });

    // SQS Queue
    const runnerQueue = new Queue(this, 'RunnerQueue', {
      queueName: `RunnerQueue-${environment}.fifo`,
      fifo: true,
      visibilityTimeout: Duration.minutes(15),
      deadLetterQueue: {
        queue: runnerDlq,
        maxReceiveCount: 1,
      },
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
        buildImage: LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
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
      timeout: Duration.minutes(15),
      role: runnerRole,
      environment: {
        NODE_OPTIONS: '--enable-source-maps false',
        REGION: Aws.REGION,
        RUNNER_BUCKET: runnerBucket.bucketName,
        RUNNER_BUILD: runnerBuild.projectName,
      },
    });
    runnerFunction.addEventSource(new SqsEventSource(runnerQueue, { 
      batchSize: 1, 
      enabled: true,
      reportBatchItemFailures: true,
    }));

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

    // Create a cross-account role if consoleAccountId context is provided
    const consoleAccountId = this.node.tryGetContext('consoleAccountId') as string | undefined;
    if (consoleAccountId) {
      const crossAccountRole = new Role(this, 'RunnerCrossAccountRole', {
        roleName: `RunnerCrossAccountRole-${environment}`,
        assumedBy: new AccountPrincipal(consoleAccountId),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
        ],
      });
      // Allow the Console (when assuming this role) to send messages to the runner queue
      runnerQueue.grantSendMessages(crossAccountRole);

      // Add SSM read/write permissions and KMS decrypt for secure parameters used by builds
      crossAccountRole.addToPolicy(new PolicyStatement({
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParameterHistory',
          'ssm:PutParameter',
          'kms:Decrypt',
        ],
        resources: ['arn:aws:ssm:*:*:parameter/thunder/*'],
      }));

      new CfnOutput(this, 'RunnerCrossAccountRoleArn', {
        description: 'ARN of role Console can assume to access Runner account',
        value: crossAccountRole.roleArn,
      });
    } else {
      // no-op: consoleAccountId not provided
    }

    // Outputs
    new CfnOutput(this, 'RunnerQueueUrl', {
      description: 'URL of the SQS queue for runner',
      value: runnerQueue.queueUrl,
    });
    new CfnOutput(this, 'RunnerDlqUrl', {
      description: 'URL of the Dead Letter Queue for runner',
      value: runnerDlq.queueUrl,
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
