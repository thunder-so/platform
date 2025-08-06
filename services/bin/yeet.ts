#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { YeetStack } from '../lib/yeet/yeet-stack';

const app = new cdk.App();
new YeetStack(app, 'YeetStack');
