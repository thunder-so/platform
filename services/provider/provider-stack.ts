import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ProviderStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // TODO: Define resources for Provider service here
  }
}
