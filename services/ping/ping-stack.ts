import { Stack, StackProps, Duration, Arn, ArnFormat, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Role, CompositePrincipal, ServicePrincipal, ManagedPolicy, PolicyStatement, Effect, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class PingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const environment = this.node.tryGetContext('environment') || 'sandbox';

    // Resource: AWS::Events::EventBus (Ping)
    const eventBus = new EventBus(this, 'Ping', {
      eventBusName: `PingEvents-${environment}`,
    });

    // Resource: AWS::Events::EventBusPolicy (PingEventsPolicy)
    eventBus.addToResourcePolicy(new PolicyStatement({
      sid: `AllowCrossAccountAndRegion-${environment}`,
      effect: Effect.ALLOW,
      actions: ['events:PutEvents'],
      principals: [new AnyPrincipal()],
      resources: [eventBus.eventBusArn],
      conditions: {
        ArnLike: {
          'aws:SourceArn': `arn:aws:events:*:*:rule/*`,
        },
      },
    }));

    const functionName = `PingFunction-${environment}`;

    // Resource: AWS::IAM::Role (PingFunctionRole)
    const pingFunctionRole = new Role(this, 'PingFunctionRole', {
      roleName: `PingFunctionRole-${environment}`,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('s3.amazonaws.com'),
        new ServicePrincipal('sqs.amazonaws.com'),
        new ServicePrincipal('events.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com')
      ),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
      ],
    });

    // Inline Policy: AssumeRolePolicy
    pingFunctionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::*:role/*'],
    }));

    // Inline Policy: SSMParameterAccessPolicy
    pingFunctionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParameterHistory',
        'kms:Decrypt',
      ],
      resources: [Arn.format({ service: 'ssm', resource: 'parameter/thunder/*' }, this)],
    }));

    // Inline Policy: CodePipelineAccessPolicy
    pingFunctionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['codepipeline:GetPipelineExecution'],
      resources: ['arn:aws:codepipeline:*:*:*'],
    }));
    
    // Inline Policy: CloudWatchLogsPolicy
    pingFunctionRole.addToPolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
        ],
        resources: [Arn.format({
            service: 'logs',
            resource: 'log-group',
            resourceName: `/aws/lambda/${functionName}:*`,
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }, this)],
    }));

    // Inline Policy: LambdaInvokePolicy
    pingFunctionRole.addToPolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction', 'events:InvokeFunction'],
        resources: [Arn.format({
            service: 'lambda',
            resource: 'function',
            resourceName: functionName,
        }, this)],
    }));

    // Resource: AWS::Serverless::Function (PingFunction)
    const pingFunction = new NodejsFunction(this, 'PingFunction', {
      functionName: functionName,
      entry: path.join(__dirname, '../ping/event.ts'),
      handler: 'handler',
      depsLockFilePath: path.join(__dirname, '../../bun.lock'),
      runtime: Runtime.NODEJS_22_X,
      role: pingFunctionRole,
      memorySize: 1024,
      timeout: Duration.seconds(180),
      environment: {
        NODE_OPTIONS: '--enable-source-maps false',
        REGION: this.region,
      }
    });

    // Resource: AWS::Events::Rule (PingEventsRule)
    const rule = new Rule(this, 'PingEventsRule', {
      ruleName: `PingEventsRule-${environment}`,
      eventBus: eventBus,
      eventPattern: {
        source: ['aws.codepipeline'],
      },
      targets: [new LambdaFunction(pingFunction)],
    });
    
    // Resource: AWS::Lambda::Permission (PingFunctionPermission) is created implicitly by setting the target.

    // Outputs
    new CfnOutput(this, 'PingFunctionRoleArn', {
      value: pingFunctionRole.roleArn,
      description: 'ARN of the Role created for Ping Function',
    });

    new CfnOutput(this, 'PingFunctionArn', {
      value: pingFunction.functionArn,
      description: 'ARN of the Ping Function',
    });

    new CfnOutput(this, 'PingEventBusArn', {
      value: eventBus.eventBusArn,
      description: 'ARN of the Ping Event Bus',
    });
  }
}