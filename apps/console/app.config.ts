export default defineAppConfig({
  regions: [
    { name: "us-east-1", label: "US East (N. Virginia)" },
    { name: "us-east-2", label: "US East (Ohio)" },
    { name: "us-west-1", label: "US West (N. California)" },
    { name: "us-west-2", label: "US West (Oregon)" },
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
  ]
})
