#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProviderStack } from '../lib/provider/provider-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'sandbox';
new ProviderStack(app, `ProviderStack-${environment}`);
