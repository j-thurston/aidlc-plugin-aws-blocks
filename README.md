# aws-blocks — AI-DLC Plugin

An [AI-DLC V2](https://awslabs.github.io/aidlc-workflows/) plugin that adds
**local-first, full-stack development with [AWS Blocks](https://docs.aws.amazon.com/blocks/latest/devguide/concepts.html)**
to the core workflow. Scaffold, develop, and test a TypeScript app entirely on
your machine — no AWS account — then promote the *same code* to an ephemeral
sandbox and finally to production, each behind a human acceptance gate.

The plugin adds three stages, a Blocks-aware developer agent, a scope, a health
sensor, and two contribution overlays that enrich the core Solution Design and
Build-and-Test stages. It contributes to any harness (Claude Code, Kiro,
Codex, Cursor) via the AI-DLC
[plugin mechanism](https://awslabs.github.io/aidlc-workflows/reference/18-plugin-mechanism/)
— no core files are edited.

## Prerequisites

- **Node.js 20+** — the Blocks runtime
- **Bun** — required by the AI-DLC V2 engine and the plugin's TypeScript tools
- **AI-DLC V2** installed on your harness
- **AWS CLI** — only needed for the sandbox and production deploy stages

Run `/aidlc --doctor` after installing to confirm the `aws-blocks` checks pass.

## What it adds

| Kind | Item | Purpose |
|---|---|---|
| Scope | `aws-blocks-fullstack` | Opt-in scope that routes the three Blocks stages on-path |
| Stage (construction) | `blocks-local-dev` | Scaffold + iterate locally with `npm run dev` |
| Stage (operation) | `blocks-sandbox-deploy` | Ephemeral AWS deploy to test against real services |
| Stage (operation) | `blocks-production-deploy` | Gated production deployment |
| Overlay | `solution-design` | Adds Block Architecture Selection to the core Design stage |
| Overlay | `build-and-test` | Adds local integration verification to the core Build-and-Test stage |
| Agent | `aws-blocks-developer-agent` | Blocks-expert developer persona (`tier: judgment`) |
| Knowledge | `blocks-catalog.md`, `local-to-cloud-mapping.md` | Block reference + local/cloud behavior |
| Sensor | `blocks-local-health` | Verifies the local Blocks env on stage entry |
| Tools | `aidlc-blocks-local-health.ts`, `aws-blocks-doctor.ts` | Sensor + `--doctor` checks |

## Stage flow

```text
Inception ── Solution Design ──(overlay: Block Architecture Selection)
                    │
Construction ── blocks-local-dev ──(sensor: blocks-local-health)
                    │                 Build-and-Test ──(overlay: local integration verify)
                    ▼
Operation ── blocks-sandbox-deploy ── blocks-production-deploy
             (real-service testing)   (gated prod deploy)
```

The three Blocks stages chain via `requires_stage`:
`blocks-local-dev → blocks-sandbox-deploy → blocks-production-deploy`.

## Installation (per harness)

Once packaged (`bun scripts/package.ts` in the AI-DLC repo), install per harness:

```bash
# Claude Code
/plugin marketplace add <repo>/dist/plugins/aws-blocks/claude
/plugin install aidlc-aws-blocks@aidlc-plugins

# Kiro CLI (folder-drop)
PLUGIN_ROOT="$(pwd)/dist/plugins/aws-blocks/kiro"
cp -r "$PLUGIN_ROOT"/. <project>/
AIDLC_PLUGIN_ROOT="$PLUGIN_ROOT" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro aidlc plugin sync

# Codex CLI
codex plugin marketplace add <repo>/dist/plugins/aws-blocks/codex
codex plugin add aidlc-aws-blocks@aidlc-plugins
```

Then verify:

```bash
/aidlc --doctor                       # aws-blocks checks should pass
/aidlc plugin list                    # aws-blocks enabled
/aidlc --scope aws-blocks-fullstack   # routes through the Blocks stages
```

## Usage

Select the scope to put the Blocks stages on-path:

```bash
/aidlc --scope aws-blocks-fullstack
```

The workflow then routes through Block selection (during Design), local
development, sandbox testing, and production deployment. Because the scope is
opt-in (`freeform_default: false`), projects that don't use Blocks see no
change. With the plugin enabled, the Solution Design overlay surfaces Block
selection even on non-Blocks scopes.

## Development

```bash
bun install       # install dev deps (@types/node, bun-types, typescript, yaml)
bun run typecheck # tsc --noEmit over tools/
bun test          # content-validation suite (tests/plugin-content.test.ts)
bun run doctor    # run the plugin doctor checks
bun run health    # run the local-health sensor check
```

The content test validates frontmatter, the stage graph
(`requires_stage` + produce/consume consistency), the scope's stage
references, overlay targets, the agent stem/name match, and the sensor →
tool reference — so a rename or a broken cross-reference fails CI.

## Contributing

- Keep each stage's frontmatter consistent with the artifact vocabulary
  (`produces` / `consumes`) — the content test enforces it.
- Block API details live in the `@aws-blocks/blocks` package steering files;
  the knowledge docs here summarize and reference them rather than duplicating.
- Prefer a Block over a raw CDK escape hatch; document any escape hatch in the
  Solution Design **CDK Extensions** subsection.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
