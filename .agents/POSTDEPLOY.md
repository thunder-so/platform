# Console

After deploying console, the lambda execution role needs permissions.

Policy name: AssumeRoleOnCustomerAccount

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Action": "sts:AssumeRole",
			"Resource": "arn:aws:iam::*:role/thunder-*"
		}
	]
}
```

Policy name: ReadLogsOnCustomerAccount

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:DescribeLogStreams",
        "logs:DescribeLogGroups",
		"logs:GetLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:*"
    }
  ]
}
```

Policy name: SendSQSMessage

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:us-east-1:047719662375:RunnerQueue-sandbox.fifo"
    }
  ]
}
```
