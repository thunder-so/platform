## Thunder

The open source platform-as-a-service. Alternative to Heroku, Render and Vercel. Built on top of AWS.



### Set up Supabase

```env
SUPABASE_URL=https://
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL="postgres://"
```

### Deploy the Supabase Functions

To deploy the Supabase functions, run the following command:

```sh
supabase functions deploy email-invite --no-verify-jwt
supabase functions deploy github-webhook --no-verify-jwt
supabase functions deploy polar-webhook --no-verify-jwt
```

### Deploy Services CDK Stack 

There are three services:
- Provider: Exposes a Lambda endpoint which is used to connect AWS Accounts to Thunder.
- Runner: The AWS CodeBuild configuration system which installs Thunder CDK stacks on a given AWS Account.
- Ping: Receives pipeline execution events from any AWS Account.

```sh
cdk deploy -c environment=sandbox
```

#### Cross-account notes

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

The console lambda needs the following permissions to perform platform tasks as `PlatformPermissionsPolicy`

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
        "arn:aws:sts::*:role/*",
        "arn:aws:sqs:*:*:*",
        "arn:aws:ssm:*:*:parameter/thunder/*",
        "arn:aws:logs:*:*:*",
        "arn:aws:kms:*:*:key/*"
      ]
    }
  ]
}

```