export default defineAppConfig({
  regions: [
    { name: "us-east-1", label: "US East 1 (N. Virginia)" },
    { name: "us-east-2", label: "US East 2 (Ohio)" },
    { name: "us-west-1", label: "US West 1 (N. California)" },
    { name: "us-west-2", label: "US West 2 (Oregon)" },
    { name: "ca-central-1", label: "Canada (Central)" },
    { name: "af-south-1", label: "Africa (Cape Town)" },
    { name: "ap-east-1", label: "Asia Pacific (Hong Kong)" },
    { name: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
    { name: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
    { name: "ap-northeast-3", label: "Asia Pacific (Osaka)" },
    { name: "ap-south-1", label: "Asia Pacific (Mumbai)" },
    { name: "ap-south-2", label: "Asia Pacific (Hyderabad)" },
    { name: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
    { name: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
    { name: "ap-southeast-3", label: "Asia Pacific (Jakarta)" },
    { name: "eu-central-1", label: "Europe (Frankfurt)" },
    { name: "eu-central-2", label: "Europe (Zurich)" },
    { name: "eu-north-1", label: "Europe (Stockholm)" },
    { name: "eu-south-1", label: "Europe (Milan)" },
    { name: "eu-south-2", label: "Europe (Spain)" },
    { name: "eu-west-1", label: "Europe (Ireland)" },
    { name: "eu-west-2", label: "Europe (London)" },
    { name: "eu-west-3", label: "Europe (Paris)" },
    { name: "me-central-1", label: "Middle East (UAE)" },
    { name: "me-south-1", label: "Middle East (Bahrain)" },
    { name: "sa-east-1", label: "South America (São Paulo)" }
  ],
  // Runtimes supported by AWS CodeBuild
  runtimes: [
    {
      label: "Node.js 24.4.1 (Current)",
      runtime: "nodejs",
      value: "24"
    },
    {
      label: "Node.js 23.11.1",
      runtime: "nodejs",
      value: "23"
    },
    {
      label: "Node.js 22.17.1 (LTS)",
      runtime: "nodejs",
      value: "22"
    },
    {
      label: "Node.js 21.7.3",
      runtime: "nodejs",
      value: "21"
    },
    {
      label: "Node.js 20.19.4 (LTS)",
      runtime: "nodejs",
      value: "20"
    }
  ],
  // Runtimes supported by AWS Lambda for functions
  lambdaRuntimes: [
    {
      label: 'Node.js 22.x',
      value: 'nodejs22.x',
    },
    {
      label: 'Node.js 20.x',
      value: 'nodejs20.x',
    },
  ],
  stacks: [
    { type: "SPA", source: "@thunderso/cdk-spa", version: "0.22.1" },
    { type: "FUNCTION", source: "@thunderso/cdk-functions", version: "0.6.2" },
    { type: "WEB_SERVICE", source: "@thunderso/cdk-webservice", version: "0.3.1" },
  ],
  fargate: {
    cpuOptions: [
      { label: '0.25 vCPU', value: 256 },
      { label: '0.5 vCPU', value: 512 },
      { label: '1 vCPU', value: 1024 },
      { label: '2 vCPU', value: 2048 },
      { label: '4 vCPU', value: 4096 }
    ],
    memoryOptions: {
      256: [
        { label: '512 MB', value: 512 },
        { label: '1 GB', value: 1024 },
        { label: '2 GB', value: 2048 }
      ],
      512: [
        { label: '1 GB', value: 1024 },
        { label: '2 GB', value: 2048 },
        { label: '3 GB', value: 3072 },
        { label: '4 GB', value: 4096 }
      ],
      1024: [
        { label: '2 GB', value: 2048 },
        { label: '3 GB', value: 3072 },
        { label: '4 GB', value: 4096 },
        { label: '5 GB', value: 5120 },
        { label: '6 GB', value: 6144 },
        { label: '7 GB', value: 7168 },
        { label: '8 GB', value: 8192 }
      ],
      2048: Array.from({ length: 13 }, (_, i) => {
        const gb = 4 + i;
        return { label: `${gb} GB`, value: gb * 1024 };
      }),
      4096: Array.from({ length: 23 }, (_, i) => {
        const gb = 8 + i;
        return { label: `${gb} GB`, value: gb * 1024 };
      })
    }
  }
})
