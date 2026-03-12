import * as cdk from 'aws-cdk-lib';
import { RunnerService } from '../runner/runner-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'sandbox';
new RunnerService(app, `service-runner-${environment}`);