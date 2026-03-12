import * as cdk from 'aws-cdk-lib';
import { ProviderService } from '../provider/provider-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'sandbox';
new ProviderService(app, `service-provider-${environment}`);
