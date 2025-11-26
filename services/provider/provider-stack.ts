import { Stack, StackProps, Aws, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, ManagedPolicy, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class ProviderService extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const environment = this.node.tryGetContext('environment') || 'sandbox';

    // IAM Role for the Provider Lambda
    const providerFunctionRole = new Role(this, 'ProviderFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda Function to handle CloudFormation Custom Resource requests
    const providerFunction = new NodejsFunction(this, 'ProviderFunction', {
      functionName: `ProviderFunction-${environment}`,
      entry: path.join(__dirname, 'handler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      role: providerFunctionRole,
      timeout: Duration.seconds(30),
      depsLockFilePath: path.join(__dirname, '../../bun.lock'),
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Allow any account to invoke this function via CloudFormation
    providerFunction.addPermission('AllowCloudFormation', {
        principal: new AnyPrincipal(),
        action: 'lambda:InvokeFunction',
    });

    // Output the function ARN
    new CfnOutput(this, 'ProviderFunctionArn', {
      description: 'ARN of the Provider Function',
      value: providerFunction.functionArn,
    });
  }
}
