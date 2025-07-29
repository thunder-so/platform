import { z } from 'zod';

export const appPropsSchema = z.object({
  rootDir: z.string(),
  outputDir: z.string(),
}).partial();

export const pipelinePropsSchema = z.object({
  sourceProps: z.object({
    owner: z.string(),
    repo: z.string().optional(),
    branchOrRef: z.string().optional(),
  }).partial().optional(),
  buildProps: z.object({
    runtime: z.string().optional(),
    runtime_version: z.number().optional(),
    installcmd: z.string().optional(),
    buildcmd: z.string().optional(),
    environment: z.record(z.string(), z.string()).optional(),
  }).partial().optional(),
  eventBus: z.string().optional(),
}).partial();

export const functionPropsSchema = z.object({
  dockerFile: z.string().optional(),
  memorySize: z.number().optional(),
  timeout: z.number().optional(),
  keepWarm: z.boolean().optional(),
}).partial();

export const webServicePropsSchema = z.object({
  dockerFile: z.string().optional(),
  desiredCount: z.number(),
  cpu: z.number().optional(),
  memorySize: z.number().optional(),
  port: z.number().optional(),
}).partial();

export const domainPropsSchema = z.object({
  domain: z.string().optional(),
  globalCertificateArn: z.string().optional(),
  regionalCertificateArn: z.string().optional(),
  hostedZoneId: z.string().optional(),
}).partial();

export const edgePropsSchema = z.object({
  headers: z.array(z.object({
    path: z.string(),
    name: z.string(),
    value: z.string(),
  })).optional(),
  redirects: z.array(z.object({
    source: z.string(),
    destination: z.string(),
  })).optional(),
  rewrites: z.array(z.object({
    source: z.string(),
    destination: z.string(),
  })).optional(),
}).partial();
