# Local-to-Cloud Mapping

How AWS Blocks runs the *same* application code differently depending on
context — local dev, ephemeral sandbox, and production — and where the
behavioral seams are. Read this alongside `blocks-catalog.md`.

## Conditional exports — one code path, three runtimes

A Block is authored once in `aws-blocks/index.ts`. The Blocks toolchain uses
**conditional exports** to swap the implementation per context:

```
aws-blocks/index.ts   ──▶  local dev      → in-process implementation (PGlite, local JWT, filesystem)
                      ──▶  CDK synthesis   → aws-blocks/index.cdk.ts generates the CloudFormation
                      ──▶  Lambda runtime  → the deployed handler binds to real AWS services
```

You do not write three versions. You write the IFC layer; the toolchain
resolves which export applies. The CDK layer (`aws-blocks/index.cdk.ts`) is
only authored by hand when a resource has **no Block** (an escape hatch).

## Behavioral differences (local vs production)

Because the implementations differ, behavior differs in ways worth designing
for. Test the ones that matter for your app in the **sandbox** stage, not just
locally.

| Concern | Local | Production | Watch for |
|---|---|---|---|
| Latency | Sub-ms (in-process) | Network round-trips (single-digit-to-tens of ms) | Chatty N+1 access patterns hidden locally |
| Consistency | Immediate (single process) | Eventual for some services (DynamoDB, S3) | Read-after-write assumptions |
| Concurrency | Single process | Many Lambda instances | Shared in-memory state that doesn't exist in prod |
| Limits / quotas | None | Service quotas, throttling | Bulk operations that exceed prod limits |
| Cold start | None | Lambda cold starts | First-request latency |
| IAM | None (everything permitted) | Scoped roles per Block | Permission-boundary failures only visible in the cloud |

The rule: **local proves the app is functionally correct; the sandbox proves
it behaves correctly against real services.**

## When to use sandbox vs local

Stay **local** for:

- Feature development and the tight edit → `npm run dev` → verify loop
- Business logic, API shape, UI, auth flows (local JWT), data modeling
- Anything where in-process fidelity is good enough

Go to the **sandbox** (`npm run sandbox`) for:

- **IAM testing** — the only place permission scoping is real
- **DynamoDB query patterns** — real partition/sort-key behavior, throttling,
  eventual consistency
- **Real S3** — multipart uploads, event notifications, presigned-URL edge cases
- **Latency-sensitive** flows — measure real network round-trips
- **Bedrock** behavior (vs local Ollama) when model choice/latency matters

The sandbox hot-swaps in seconds, so iterate locally and re-deploy the sandbox
only to validate real-service behavior.

## The `.bb-data/` directory

Local persistence lives under `.bb-data/` at the project root:

```
.bb-data/
├── db/         # PGlite Postgres data files (Database Block)
├── kv/         # KVStore snapshots (if persisted)
├── files/      # FileBucket local objects (FileBucket Block)
├── email/      # Captured emails (EmailClient Block, not sent locally)
└── vectors/    # Local vector index (KnowledgeBase Block)
```

Guidance:

- **Git-ignore `.bb-data/`** — it is local state, not source.
- Delete `.bb-data/` to reset local state (fresh DB, cleared files) — the next
  `npm run dev` re-seeds migrations.
- The `blocks-local-health` sensor checks `.bb-data/` migrations applied during
  the build-and-test stage.

## CDK escape hatch

When the app needs a resource with no Block, drop to the CDK layer:

- Author it in `aws-blocks/index.cdk.ts`
- Document it in the Solution Design **CDK Extensions** subsection (the plugin's
  `solution-design` contribution requires this)
- Prefer a Block whenever one exists — the escape hatch forfeits the local-first
  guarantee (custom CDK resources have no local implementation and must be
  tested in the sandbox).
