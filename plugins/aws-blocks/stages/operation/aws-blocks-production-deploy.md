---
slug: aws-blocks-production-deploy
name: Production Deployment (AWS Blocks)
plugin: aws-blocks
phase: operation
execution: CONDITIONAL
condition: Execute when the aws-blocks-fullstack scope is active and the sandbox-validated app is approved for promotion to production.
lead_agent: aws-blocks-developer-agent
mode: inline
scopes:
  - aws-blocks-fullstack
requires_stage:
  - aws-blocks-sandbox-deploy
produces:
  - aws-blocks-production-url
consumes:
  - artifact: aws-blocks-sandbox-url
    required: true
inputs: aws-blocks-sandbox-url (the sandbox-validated deployment) and the aws-blocks/index.ts IFC layer (+ optional index.cdk.ts)
outputs: aws-blocks-production-url.md — the live, verified production endpoint (under this stage's record dir, engine-resolved)
---

## Purpose

Final production deployment. The same code validated locally and in the
sandbox is promoted to a production AWS environment with an explicit
pre-deploy review and post-deploy verification gate.

## Steps

### Step 1: Pre-deploy checklist

Before deploying, review:

- CDK layer (`aws-blocks/index.cdk.ts`) if any escape-hatch resources exist
- IAM audit — confirm least-privilege scoping on all Block-provisioned roles
- Production configuration (region, domain, environment variables)
- Rollback plan — document how to reverse this deploy

### Step 2: Deploy to production

Run `npm run deploy`. This provisions the production stack from the same IFC
layer used locally and in the sandbox.

### Step 3: Production smoke test

Run the smoke-test suite against the production URL. Verify core flows
(auth, primary API methods, data persistence) succeed.

### Step 4: DNS / domain configuration

If a custom domain applies, configure DNS/domain routing and verify TLS.

### Step 5: Gate — post-deploy verification

Human confirms production is healthy: smoke tests green, key metrics nominal,
no elevated error rate. Record the production URL and verification results in
the stage diary.

## Produces

- **aws-blocks-production-url**: the live, verified production endpoint
