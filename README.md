# Thunder

The open source platform-as-a-service for AWS. Alternative to AWS Amplify, Heroku, Render and Vercel. 

This is a Turborepo monorepo which contains:
- `apps/console` Nuxt project which is the UI
- `services` is a collection of CDK stacks
  - Provider: Exposes a Lambda endpoint which is used to connect AWS Accounts to Thunder.
  - Runner: The AWS CodeBuild configuration system which installs Thunder CDK stacks on a given AWS Account.
  - Ping: Receives pipeline execution events from AWS Accounts.
- `supabase/functions` is a collection of Supabase serverless functions using Deno
- `packages/types` defines the cardinal types based on our CDK stacks:
  - [CDK-SPA](https://github.com/thunder-so/cdk-spa) for static site hosting on S3 and CloudFront
  - [CDK-Functions](https://github.com/thunder-so/cdk-functions) for Lambda and API Gateway
  - [CDK-WebService](https://github.com/thunder-so/cdk-webservice) for ECS Fargate and API Gateway

## Self-hosting

Thunder is serverless and costs $0 to run on your infrastructure. In order to self-host Thunder, we must deploy the console, services and functions separately.

### Prerequisites

- Supabase account and database
- AWS Account
- Github Account and a Github App

### Deploy the Console

Console is deployed using [CDK-Nuxt](https://github.com/thunder-so/cdk-nuxt). Follow instructions in the repository for details.

```sh
cd apps/console
cp .env.example .env
npm run build
npm run deploy
```

The console lambda needs the following permissions to perform platform tasks. Save as `PlatformPermissionsPolicy`

```JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole",
        "sqs:SendMessage",
        "ssm:PutParameter",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParameterHistory",
        "logs:GetLogEvents",
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": [
        "arn:aws:iam::*:role/*",
        "arn:aws:sqs:*:*:*",
        "arn:aws:ssm:*:*:parameter/thunder/*",
        "arn:aws:logs:*:*:*",
        "arn:aws:kms:*:*:key/*"
      ]
    }
  ]
}
```

### Deploy the Supabase Functions

To deploy the Supabase functions, run the following command:

```sh
supabase functions deploy email-invite --no-verify-jwt
supabase functions deploy github-webhook --no-verify-jwt
supabase functions deploy polar-webhook --no-verify-jwt
```

### Deploy Services CDK Stacks

```sh
npm run deploy:provider:sandbox
npm run deploy:runner:sandbox
npm run deploy:ping:sandbox
```

After deploying `Ping` service, take note of the `PingEventBusArn`. It will look like:

```
arn:aws:events:us-east-1:447711669900:event-bus/PingEvents-sandbox
```

Set the ARN as an environment variable in `RunnerFunction-sandbox` as `EVENT_TARGET`


## Advanced

#### Cross-account deployment notes

If you deploy the Runner in a separate AWS account from the Console you should create (or enable) a cross-account role in the Runner account that the Console can assume to read logs and other read-only resources.

- Provide the Console account id at deploy time for the Runner stack so the stack will create a small `RunnerCrossAccountRole` and output its ARN:

```sh
cdk deploy -c environment=sandbox -c consoleAccountId=111122223333
```

- Then set the following environment variables for the Console service (locally or in deployment):

```env
RUNNER_ASSUME_ROLE_ARN=arn:aws:iam::222233334444:role/RunnerCrossAccountRole-sandbox
RUNNER_REGION=us-east-1 # optional; defaults to the Console AWS_REGION
RUNNER_SERVICE=https://sqs.us-east-1.amazonaws.com/222233334444/RunnerQueue-sandbox.fifo
```

With `RUNNER_ASSUME_ROLE_ARN` set, the Console `PlatformLibrary.getCloudWatchLogs` will assume that role (via STS) and query CloudWatch in the Runner account. If the env var is not set, the Console will query CloudWatch with its own credentials (useful for single-account deployments).

