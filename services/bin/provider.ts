#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProviderService } from '../provider/provider-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'sandbox';
new ProviderService(app, `ProviderService-${environment}`);
