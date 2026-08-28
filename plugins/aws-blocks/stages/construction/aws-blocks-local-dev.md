---
slug: aws-blocks-local-dev
name: Local Development (AWS Blocks)
plugin: aws-blocks
phase: construction
execution: CONDITIONAL
condition: Execute when the deployment target is AWS (the infrastructure specification names AWS services) and the team wants to validate against Block-emulated AWS services locally before deploying. Skip when the target is not AWS.
lead_agent: aws-blocks-developer-agent
mode: inline
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - infra
  - classic
  - workshop
produces:
  - aws-blocks-local-app
  - aws-blocks-ifc-layer
consumes:
  - artifact: infrastructure-specification
    required: true
  - artifact: components
    required: true
  - artifact: functional-spec
    required: false
requires_stage:
  - infrastructure-design
sensors:
  - blocks-local-health
inputs: infrastructure-design infrastructure-specification.md (establishes the AWS target), domain-design components.md, functional-design functional-spec.md (if produced)
outputs: aws-blocks/index.ts (the IFC layer that emulates the AWS services locally) and a running local app verified via npm run dev (under this stage's record dir, engine-resolved)
---

## Purpose

Scaffold and develop the application locally using AWS Blocks. The agent
creates the IFC layer (`aws-blocks/index.ts`), instantiates required Blocks
(Database, Auth, Agent, FileBucket, etc.), and iterates with `npm run dev`
until the local app is functional.

This stage embodies the local-first principle: everything runs on the
developer's machine — no AWS account, no cloud resources, sub-second feedback.

## Steps

### Step 1: Scaffold or validate project structure

If no `aws-blocks/` directory exists, run:

```
npm create @aws-blocks/blocks-app@latest .
```

If it exists, verify `package.json` has `@aws-blocks/blocks` and run
`npm install`.

### Step 2: Map the AWS services to Blocks

Read the `infrastructure-specification` artifact — it names the AWS services this
app will deploy to — alongside the Component Catalogue (`components`). Each AWS
service maps to the Block that emulates it locally, so the local app exercises a
like-for-like environment before the AWS deploy:

- Aurora / RDS → `Database` (PGlite locally)
- DynamoDB → `KVStore`
- Cognito → `AuthBasic` / `AuthSocial`
- S3 → `FileBucket`
- Lambda + SQS → `AsyncJob`; EventBridge + Lambda → `CronJob`
- API Gateway WebSocket → `Realtime`
- Bedrock → `Agent`; Bedrock Knowledge Bases → `KnowledgeBase`
- SES → `EmailClient`
- CloudWatch → `Logger` / `Metrics` / `Tracer`

Consult the `blocks-catalog` knowledge file for constructor signatures and
`local-to-cloud-mapping` for the behavioral differences between each Block's
local emulation and its production AWS service.

Write `aws-blocks/index.ts` with the selected Blocks composed in a single Scope.

### Step 3: Implement API methods

Define the `ApiNamespace` with type-safe methods matching the user stories.
Use `BlocksContext` for auth-gated endpoints. Let Blocks' TypeScript inference
propagate schema changes — no codegen steps.

### Step 4: Start local dev and iterate

Run `npm run dev`. Verify:

- App running at localhost:3000
- Database seeded with test data
- Auth flow working (local JWT)
- All API methods callable from frontend

Fix issues in a tight loop (hot reload gives sub-second feedback).

### Step 5: Gate — local acceptance

The human verifies the local app meets the design intent. Record any
deviations or scope changes in the stage diary (`memory.md`). Do not proceed
to any cloud deploy until this gate passes.

## Produces

- **aws-blocks-local-app**: the running, verified local application
- **aws-blocks-ifc-layer**: the authored `aws-blocks/index.ts` (Block composition + API)
