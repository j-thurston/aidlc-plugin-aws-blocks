---
target: solution-design
plugin: aws-blocks
adds:
  produces:
    - aws-blocks-block-selection
  required_sections:
    - "Block Architecture"
fragments:
  - anchor: after-step:3
    order: 100
---

## fragment: after-step:3

### Step 3a (aws-blocks): Block Architecture Selection

Before finalizing the architecture, map each system capability to an AWS Block:

| Capability | Block | Local Implementation | Production Service |
|-----------|-------|---------------------|-------------------|
| Data store | `Database` | PGlite (in-process Postgres) | Aurora Serverless |
| Key-value | `KVStore` | In-memory map | DynamoDB |
| Auth | `AuthBasic` / `AuthSocial` | Local JWT | Cognito |
| Files | `FileBucket` | Local filesystem | S3 |
| Background jobs | `AsyncJob` | Local execution | Lambda + SQS |
| Scheduled tasks | `CronJob` | Local timer | EventBridge + Lambda |
| Realtime | `Realtime` | Local WebSocket | API Gateway WebSocket |
| AI agents | `Agent` | Ollama / OpenAI-compat | Bedrock |
| RAG | `KnowledgeBase` | Local vector | Bedrock Knowledge Bases |
| Email | `EmailClient` | Local capture | SES |
| Observability | `Logger` / `Metrics` / `Tracer` | Console | CloudWatch |

Document the selection in a **Block Architecture** section. Note any gaps where
a custom Block or CDK escape-hatch is needed.

If the CDK layer is needed (resources without a Block), document those in
a **CDK Extensions** subsection referencing `aws-blocks/index.cdk.ts`.

The result of this step is the `aws-blocks-block-selection` artifact, consumed
by the `blocks-local-dev` stage when authoring the IFC layer.
