export interface BuildRequest {
  // === Context for the runner ===
  eventId: string; // The unique ID from the `builds` table for this specific deployment event.
  
  // === Provider Information (for assuming role) ===
  provider: {
    roleArn: string;
    externalId: string; // The Organization ID
    accountId: string;
    region: string;
    accessKeyId?: string; // Manual provider credentials 
  };

  // === CDK Stack Properties (to be written to cdk.context.json) ===
  
  // Top-level properties common to all stacks (from AppProps)
  env: {
    account: string;
    region: string;
  };
  application: string; // The application name (e.g., 'my-app')
  service: string;     // The service name (e.g., 'frontend')
  environment: string; // The environment name (e.g., 'preview')

  // Properties from PipelineProps
  accessTokenSecretArn: string;
  sourceProps: {
    owner: string;
    repo: string;
    branchOrRef: string;
  };
  buildProps?: {
    runtime?: string;
    runtime_version?: string | number;
    installcmd?: string;
    buildcmd?: string;
  };
  
  // The service type determines which CDK construct to use
  stackType: 'SPA' | 'LAMBDA' | 'ECS';
  
  // The version of the CDK construct to use
  stackVersion: string;

  // --- Service-specific properties ---
  
  // A single, unified object for all service-specific configurations.
  // The runner's builder will pick the properties it needs from here.
  serviceProps: {
    // Common to SPA, Lambda, ECS
    rootDir: string;
    
    // SPA-specific
    outputDir?: string;
    redirects?: { source: string; destination: string }[];
    rewrites?: { source: string; destination: string }[];
    headers?: { path: string; name: string; value: string }[];
    errorPagePath?: string;
    
    // Common to Lambda, ECS
    dockerFile?: string;
    memorySize?: number;
    
    // Lambda-specific
    handler?: string;
    timeout?: number;
    keepWarm?: boolean;
    
    // ECS-specific
    port?: number;
    desiredCount?: number;
    cpu?: number;
  };

  // Domain props are common but have slight differences.
  domainProps?: {
    domain?: string;
    hostedZoneId?: string;
    globalCertificateArn?: string;   // For SPA/WebService (CloudFront)
    regionalCertificateArn?: string; // For Function/WebService (API Gateway)
  };
}
