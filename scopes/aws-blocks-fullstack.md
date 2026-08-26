---
name: aws-blocks-fullstack
plugin: aws-blocks
display_name: "AWS Blocks Full-Stack"
description: >
  Full-stack TypeScript application using AWS Blocks for local-first
  development. Routes through Block selection, local dev, sandbox testing,
  and production deployment.
freeform_default: false
---

## When to use

Select this scope when building a full-stack application that should:

- Run entirely locally during development (no AWS account needed)
- Deploy to AWS when ready (same code, zero changes)
- Use the Blocks abstraction for infra (Database, Auth, Realtime, AI, etc.)

## Stage routing

This scope puts the following stages on-path:

- **blocks-local-dev** (Construction): scaffold + iterate locally
- **blocks-sandbox-deploy** (Operation): ephemeral AWS deploy for real-service testing
- **blocks-production-deploy** (Operation): final production deployment

The scope also activates the plugin's contribution overlays on the core
`solution-design` (Inception) and `build-and-test` (Construction) stages, so
Block-architecture thinking and local integration verification happen inline
with the standard workflow.
