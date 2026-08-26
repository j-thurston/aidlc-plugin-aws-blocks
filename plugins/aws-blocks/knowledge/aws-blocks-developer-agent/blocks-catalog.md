# AWS Blocks Catalog

Reference for the AWS Blocks the `aws-blocks-developer-agent` composes into an
IFC layer (`aws-blocks/index.ts`). Each Block is a single instantiation inside
a Scope; capabilities map one-to-one to Blocks.

> **Source of truth**: The Blocks npm package (`@aws-blocks/blocks`) ships its
> own steering files with authoritative, versioned API signatures. Treat the
> package steering files as canonical when they disagree with this catalog —
> this document is a curated summary for workflow guidance, sourced from the
> [AWS Blocks building-blocks reference](https://docs.aws.amazon.com/blocks/latest/devguide/building-blocks-reference.html).
> Prefer referencing the package steering files by path over duplicating them.

## How to read this catalog

Each entry lists:

- **Import** — the symbol to import from `@aws-blocks/blocks`
- **Constructor** — the typical instantiation signature
- **Local** — how the Block behaves during `npm run dev` (no AWS account)
- **Production** — the AWS service the Block provisions on deploy
- **Recipe** — a common usage pattern

---

## Data & State

### Database

- **Import**: `import { Database } from "@aws-blocks/blocks"`
- **Constructor**: `new Database(scope, "Db", { schema })`
- **Local**: PGlite — in-process Postgres, zero-config, persisted under `.bb-data/`
- **Production**: Aurora Serverless (v2)
- **Recipe**: Define the schema once; the same query API runs locally and in
  the cloud. Migrations apply automatically on `npm run dev` startup.

### KVStore

- **Import**: `import { KVStore } from "@aws-blocks/blocks"`
- **Constructor**: `new KVStore(scope, "Kv")`
- **Local**: In-memory map (cleared on restart unless persisted to `.bb-data/`)
- **Production**: DynamoDB (single-table, on-demand)
- **Recipe**: Use for session data, feature flags, or any key-addressed value.
  Prefer `KVStore` over `Database` when there are no relational queries.

---

## Identity

### AuthBasic

- **Import**: `import { AuthBasic } from "@aws-blocks/blocks"`
- **Constructor**: `new AuthBasic(scope, "Auth")`
- **Local**: Local JWT issuer (dev keys, no external dependency)
- **Production**: Amazon Cognito user pool
- **Recipe**: Gate `ApiNamespace` methods with `BlocksContext` to require a
  valid token.

### AuthSocial

- **Import**: `import { AuthSocial } from "@aws-blocks/blocks"`
- **Constructor**: `new AuthSocial(scope, "Auth", { providers: ["google"] })`
- **Local**: Local JWT with a mocked provider callback
- **Production**: Cognito with federated identity providers
- **Recipe**: Use when the app needs social login; the local mock lets you test
  the auth flow with no real IdP.

---

## Files & Media

### FileBucket

- **Import**: `import { FileBucket } from "@aws-blocks/blocks"`
- **Constructor**: `new FileBucket(scope, "Files")`
- **Local**: Local filesystem under `.bb-data/files/`
- **Production**: Amazon S3
- **Recipe**: Presigned upload/download URLs work identically local and in prod.

---

## Work & Scheduling

### AsyncJob

- **Import**: `import { AsyncJob } from "@aws-blocks/blocks"`
- **Constructor**: `new AsyncJob(scope, "Job", { handler })`
- **Local**: Runs in-process (synchronous or queued in memory)
- **Production**: Lambda + SQS
- **Recipe**: Offload slow work (image processing, emails) from the request path.

### CronJob

- **Import**: `import { CronJob } from "@aws-blocks/blocks"`
- **Constructor**: `new CronJob(scope, "Cron", { schedule, handler })`
- **Local**: Local timer
- **Production**: EventBridge rule + Lambda
- **Recipe**: Periodic tasks (cleanup, digests). Schedule uses cron/rate syntax.

---

## Realtime & Messaging

### Realtime

- **Import**: `import { Realtime } from "@aws-blocks/blocks"`
- **Constructor**: `new Realtime(scope, "Rt")`
- **Local**: Local WebSocket server
- **Production**: API Gateway WebSocket API
- **Recipe**: Push updates to connected clients (live dashboards, chat).

### EmailClient

- **Import**: `import { EmailClient } from "@aws-blocks/blocks"`
- **Constructor**: `new EmailClient(scope, "Email")`
- **Local**: Local capture (emails written to `.bb-data/`, not sent)
- **Production**: Amazon SES
- **Recipe**: Inspect captured emails locally; SES sends in production.

---

## AI

### Agent

- **Import**: `import { Agent } from "@aws-blocks/blocks"`
- **Constructor**: `new Agent(scope, "Assistant", { model, tools })`
- **Local**: Ollama or any OpenAI-compatible endpoint
- **Production**: Amazon Bedrock
- **Recipe**: Point the local Agent at Ollama to iterate on prompts/tools with
  no cloud cost; the same code calls Bedrock in production.

### KnowledgeBase

- **Import**: `import { KnowledgeBase } from "@aws-blocks/blocks"`
- **Constructor**: `new KnowledgeBase(scope, "Kb", { source })`
- **Local**: Local vector store
- **Production**: Bedrock Knowledge Bases
- **Recipe**: Pair with `Agent` for RAG. Index documents locally for fast dev.

---

## Observability

### Logger / Metrics / Tracer

- **Import**: `import { Logger, Metrics, Tracer } from "@aws-blocks/blocks"`
- **Local**: Console output
- **Production**: Amazon CloudWatch (logs, metrics, X-Ray traces)
- **Recipe**: Instrument once; local runs print to console, production ships to
  CloudWatch with no code change.

---

## Composition pattern

```typescript
// aws-blocks/index.ts
import { Scope, Database, AuthBasic, FileBucket, Agent } from "@aws-blocks/blocks";

export const app = new Scope("app", (scope) => {
  const db = new Database(scope, "Db", { schema });
  const auth = new AuthBasic(scope, "Auth");
  const files = new FileBucket(scope, "Files");
  const assistant = new Agent(scope, "Assistant", { model, tools });
  // ApiNamespace methods reference these Blocks; BlocksContext gates auth.
});
```

Keep all Blocks in a single Scope. When a capability has no Block, document a
CDK escape-hatch in `aws-blocks/index.cdk.ts` (see `local-to-cloud-mapping.md`).
