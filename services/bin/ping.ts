#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PingStack } from '../lib/ping/ping-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'sandbox';
new PingStack(app, `PingStack-${environment}`);
