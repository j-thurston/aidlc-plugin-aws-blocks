---
slug: aws-blocks-local-dev
name: Local Development (AWS Blocks)
plugin: aws-blocks
phase: construction
execution: ALWAYS
condition: Always runs under the aws-blocks-fullstack scope — scaffold and iterate the app locally with AWS Blocks before any cloud deploy.
lead_agent: aws-blocks-developer-agent
mode: inline
scopes:
  - aws-blocks-fullstack
produces:
  - aws-blocks-local-app
  - aws-blocks-ifc-layer
consumes:
  - artifact: aws-blocks-block-selection
    required: true
  - artifact: components
    required: true
  - artifact: stories
    required: false
sensors:
  - blocks-local-health
inputs: aws-blocks-block-selection.md (from the Domain Design overlay), domain-design components.md, user-stories stories.md (if produced)
outputs: aws-blocks/index.ts (the IFC layer) and a running local app verified via npm run dev (under this stage's record dir, engine-resolved)
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

### Step 2: Design the IFC layer from solution artifacts

Read the `aws-blocks-block-selection` artifact (produced by this plugin's Block
Architecture Selection contribution to the Domain Design stage) alongside the
Component Catalogue (`components`). Map each capability to a Block:

- Data persistence → `Database` or `KVStore`
- User management → `AuthBasic` or `AuthSocial`
- File handling → `FileBucket`
- Background work → `AsyncJob` / `CronJob`
- AI/agents → `Agent` + `KnowledgeBase`
- Realtime → `Realtime`
- Email → `EmailClient`

Write `aws-blocks/index.ts` with the selected Blocks composed in a single
Scope. Consult the `blocks-catalog` knowledge file for constructor signatures
and the `local-to-cloud-mapping` knowledge file for behavioral differences.

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
