# Thunder Functions
====================

## Scope
- Provider
  Use installs ThunderProviderStack and sends role data.

- Installer
  

## Context

```sh
sam init -n thunder-functions --package-type Image --base-image amazon/nodejs20.x-base -d npm
```
---
Deprecated:
sam init -n console-api --package-type Image --base-image amazon/nodejs18.x-base -d npm
sam init -n console-api --package-type Zip --base-image amazon/nodejs18.x-base -d npm


## Lookup


```sh
sam list resources --stack-name thunder-functions-sandbox
sam list resources --stack-name thunder-functions-sandbox-Provider-4ODADE87I8ET

sam list endpoints --stack-name thunder-functions-sandbox-Provider-4ODADE87I8ET
sam list stack-outputs --stack-name thunder-functions-sandbox-Provider-4ODADE87I8ET
```

---

Deprecated:
sam list resources --stack-name console-api
sam list endpoints --stack-name console-api
sam list stack-outputs --stack-name console-api


## Local Development

```sh
sam build && sam local invoke Provider/ProviderFunction --event events/provider.json --env-vars env.provider.json --debug

--config-env sandbox

sam build && sam local invoke Installer/SynthFunction --event events/installer.json --env-vars env.installer.json --debug

sam build && sam local invoke Runner/RunnerFunction --event events/runner.json  --env-vars env.installer.json --debug
```

## Deploy

```sh
sam build && sam deploy --config-env sandbox --no-confirm-changeset

sam build && sam deploy --config-env production --no-confirm-changeset
```

## Debug

```sh
aws cloudformation describe-stack-events --stack-name thunder-functions-sandbox --region ap-southeast-1
```


sam delete --config-env sandbox --no-confirm-changeset

https://us-east-1.console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://thunderso.s3.amazonaws.com/ThunderProviderStack.yml&stackName=ThunderProviderStack&param_ProviderId=1234567890


```json
{
  "RequestType": "Create",
  "ServiceToken": "arn:aws:lambda:us-east-1:665186350589:function:ProviderFunction-sandbox",
  "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/arn%3Aaws%3Acloudformation%3Aus-east-1%3A665186350589%3Astack/ThunderProviderStack-sandbox/f021d4b0-1ea9-11ef-8fe6-1218cffee69f%7CThunderProvider%7Cc0a7d52c-ef4b-416b-b2dd-8d94e89b2a2c?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20240530T172812Z&X-Amz-SignedHeaders=host&X-Amz-Expires=7200&X-Amz-Credential=AKIA6L7Q4OWTW7NVVBXN%2F20240530%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=1a182047f8d5175768c398f577204d01541d3a6a084a468158a2b48ffe39caeb",
  "StackId": "arn:aws:cloudformation:us-east-1:665186350589:stack/ThunderProviderStack-sandbox/f021d4b0-1ea9-11ef-8fe6-1218cffee69f",
  "RequestId": "c0a7d52c-ef4b-416b-b2dd-8d94e89b2a2c",
  "LogicalResourceId": "ThunderProvider",
  "ResourceType": "Custom::ThunderProvider",
  "ResourceProperties": {
    "ServiceToken": "arn:aws:lambda:us-east-1:665186350589:function:ProviderFunction-sandbox",
    "RoleArn": "arn:aws:iam::665186350589:role/thunder-1234567890",
    "ProviderId": "clwv6l9wp000vo1bsj6144ofk",
    "AccountId": "665186350589",
    "Region": "us-east-1",
    "StackName": "ThunderProviderStack-sandbox"
  }
}
```


# SAM VALIDATE ERROR
====================

# PROMPT
We are working with Console API, which is a SAM project.

template.yaml is a nested stack. https://github.com/aws-samples/aws-sam-nested-stack-sample

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: 'AWS::Serverless-2018-10-31'
Description: >
  Console API

  Our little collection of lambdas.  

Resources:

  Install:
    Type: AWS::Serverless::Application
    Properties:
      Location: src/install.yaml
      Parameters:
          AllowedOrigin: 'http://localhost:3030'
```

Creates SAM Application called Install, which is found in `src/install.yaml`

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2018-10-31
Description: >
  application-installer

  SAM Template for app resources installation on Customer AWS.

Globals:
  Function:
    Timeout: 3

Resources:

  SDKLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: SDKLayer
      Description: AWS SDK NPM package.
      ContentUri: 'layers/aws-sdk/'
      CompatibleRuntimes:
        - nodejs18.x

  InstallFunctionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: InstallFunctionRole
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess

  InstallFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: install/
      Handler: service.handler
      Role: !GetAtt InstallFunctionRole.Arn
      Architectures:
        - x86_64
      Runtime: nodejs18.x
      MemorySize: 128
      Layers:
        - !Ref SDKLayer
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: "es2020"
        Sourcemap: true
        EntryPoints: 
          - service.ts
```

When we run `sam validate`, it produces an error. Explain.

E3038 Serverless Transform required for Type AWS::Serverless::Application for resource Install