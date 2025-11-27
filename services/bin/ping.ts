import * as cdk from 'aws-cdk-lib';
import { PingStack } from '../ping/ping-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'sandbox';
new PingStack(app, `PingStack-${environment}`);
