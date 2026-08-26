---
slug: aws-blocks-sandbox-deploy
name: Sandbox Deployment (AWS Blocks)
plugin: aws-blocks
phase: operation
execution: CONDITIONAL
condition: Execute when the AWS Blocks local app is validated and the team wants to verify it against real AWS services in an ephemeral sandbox before production.
lead_agent: aws-blocks-developer-agent
mode: inline
scopes:
  - enterprise
  - feature
  - infra
  - classic
  - workshop
requires_stage:
  - aws-blocks-local-dev
produces:
  - aws-blocks-sandbox-url
consumes:
  - artifact: aws-blocks-local-app
    required: true
inputs: aws-blocks-local-app (the verified local app + aws-blocks/index.ts IFC layer)
outputs: aws-blocks-sandbox-url.md — the live ephemeral sandbox endpoint, validated against real AWS services (under this stage's record dir, engine-resolved)
---

## Purpose

Deploy to an ephemeral AWS sandbox to verify behavior against real services
(DynamoDB performance, IAM boundaries, API Gateway routing). This is the first
time real cloud resources are provisioned — the local app runs unchanged.

## Steps

### Step 1: Ensure AWS credentials

Verify the developer has valid AWS credentials configured:

```
aws sts get-caller-identity
```

Confirm the account is a non-production sandbox account before deploying.

### Step 2: Deploy sandbox

Run `npm run sandbox`. This:

- Deploys the IFC layer to Lambda with hot-swapping
- Provisions real AWS resources (DynamoDB, API Gateway, etc.)
- Returns a unique sandbox URL

### Step 3: Smoke-test against real services

Run the test suite against the sandbox URL. Verify:

- Queries perform within latency targets
- Auth tokens work end-to-end
- File uploads land in S3
- IAM permissions are correctly scoped

### Step 4: Gate — sandbox acceptance

Human approves sandbox behavior. If issues found, iterate locally
(`aws-blocks-local-dev`) and re-deploy (`npm run sandbox` hot-swaps in seconds).

### Step 5: Cleanup or promote

- If promoting to production: proceed to `aws-blocks-production-deploy`.
- If done testing: `npm run sandbox:destroy` to avoid lingering cost.

## Produces

- **aws-blocks-sandbox-url**: the live ephemeral sandbox endpoint, validated against real services
