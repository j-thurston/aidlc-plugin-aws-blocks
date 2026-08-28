# aws-blocks — AI-DLC Plugin

An [AI-DLC V2](https://awslabs.github.io/aidlc-workflows/) plugin that adds an
**AWS pre-deployment fidelity path** using
[AWS Blocks](https://docs.aws.amazon.com/blocks/latest/devguide/concepts.html).
When a workflow's deployment target is AWS, the plugin lets you build and run the
app locally against Block-emulated AWS services — a like-for-like environment —
then promote the *same code* to an ephemeral AWS sandbox and finally to
production, each behind a human acceptance gate.

AWS Blocks mimic AWS services locally, so the value is testing a production-like
environment before you deploy to AWS. The plugin's stages activate
**conditionally on the deployment target being AWS** — no dedicated scope, no
opt-in flag. On any workflow whose infrastructure specification names AWS
services, the Blocks local-dev stage is offered; non-AWS workflows never see it.

The plugin adds three stages, a Blocks-aware developer agent, a health sensor,
and two contribution overlays that enrich the core Domain Design and
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
| Stage (construction) | `aws-blocks-local-dev` | Build + run the app locally against Block-emulated AWS services; conditional on an AWS deployment target |
| Stage (operation) | `aws-blocks-sandbox-deploy` | Ephemeral AWS deploy to test against real services |
| Stage (operation) | `aws-blocks-production-deploy` | Gated production deployment |
| Overlay | `domain-design` | Adds Block Architecture Selection to the core Domain Design stage |
| Overlay | `build-and-test` | Adds local integration verification to the core Build-and-Test stage |
| Agent | `aws-blocks-developer-agent` | Blocks-expert developer persona |
| Knowledge | `blocks-catalog.md`, `local-to-cloud-mapping.md` | Block reference + local/cloud behavior |
| Sensor | `blocks-local-health` | Verifies the local Blocks env before the stage runs |
| Tools | `aidlc-blocks-local-health.ts`, `aws-blocks-doctor.ts` | Sensor + `--doctor` checks |

## How it activates

The stages carry no dedicated scope. They ride the common scopes that reach
infrastructure and deployment (`enterprise`, `feature`, `mvp`, `poc`, `infra`, `classic`,
`workshop`) and are `CONDITIONAL`: `aws-blocks-local-dev` runs only when the
`infrastructure-specification` names AWS services — i.e. the app is AWS-bound.
`requires_stage: infrastructure-design` places it after the target is known, so
it slots in as a fidelity check before the AWS deploy stages.

```text
Inception ── Domain Design ──(overlay: Block Architecture Selection, if AWS-bound)
                    │
Construction ── infrastructure-design ── aws-blocks-local-dev ──(sensor: blocks-local-health)
                    (AWS target set)      │         Build-and-Test ──(overlay: local integration verify)
                    ▼
Operation ── aws-blocks-sandbox-deploy ── aws-blocks-production-deploy
             (real-service testing)       (gated prod deploy)
```

The stages chain via `requires_stage`:
`infrastructure-design → aws-blocks-local-dev → aws-blocks-sandbox-deploy → aws-blocks-production-deploy`.

## Build and install (per harness)

The plugin source lives in `plugins/aws-blocks/` (the manifest `name` must equal
the plugin's directory basename, so the tree sits in a dir literally named
`aws-blocks`). Build a host projection with the AI-DLC standalone plugin tools
(from a checkout of `awslabs/aidlc-workflows`, `v2` branch):

```bash
TOOLS="<aidlc-workflows>/core/tools"
PLUGIN="$(pwd)/plugins/aws-blocks"

bun "$TOOLS/aidlc-plugin-validate.ts" "$PLUGIN"      # offline lint (0 errors)
bun "$TOOLS/aidlc-plugin-build.ts"    "$PLUGIN" kiro  # → plugins/aws-blocks/dist/kiro/
```

Valid `<harness>` values: `claude`, `codex`, `kiro`, `kiro-ide`, `cursor`,
`opencode`, `copilot`. Then install per harness (the emitted `dist/<harness>/`
is the installable host plugin):

```bash
# Kiro (no store — folder-drop + compose)
PLUGIN_ROOT="$(pwd)/plugins/aws-blocks/dist/kiro"
cp -r "$PLUGIN_ROOT"/. <project>/
AIDLC_PLUGIN_ROOT="$PLUGIN_ROOT" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro aidlc plugin sync
# fallback when the aidlc CLI is not on PATH:
AIDLC_PLUGIN_ROOT="$PLUGIN_ROOT" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro bun "$PLUGIN_ROOT/hooks/compose.ts"

# Claude Code (host store)
/plugin marketplace add <repo>/plugins/aws-blocks/dist/claude
/plugin install aidlc-aws-blocks@aidlc-plugins

# Codex CLI (host store, in a git repo)
codex plugin marketplace add <repo>/plugins/aws-blocks/dist/codex
codex plugin add aidlc-aws-blocks@aidlc-plugins   # approve the one-time hook trust
```

Then verify:

```bash
/aidlc --doctor        # aws-blocks checks should pass
/aidlc plugin list     # aws-blocks enabled
```

## Usage

Once installed, the plugin is active for any AWS-bound workflow — no scope or
flag to set. Run AI-DLC as normal:

```bash
/aidlc "a todo app with a database and login"
```

When the workflow's infrastructure design targets AWS, `aws-blocks-local-dev`
becomes available in Construction to build a Block-emulated local environment,
and the sandbox/production deploy stages follow in Operation. Workflows that do
not target AWS never route these stages. With the plugin enabled, the Domain
Design overlay also surfaces the Block Architecture Selection step for AWS-bound
designs.

## Development

```bash
bun install       # install dev deps (@types/node, bun-types, typescript, yaml)
bun run typecheck # tsc --noEmit over plugins/aws-blocks/tools/
bun test          # content-validation suite (plugins/aws-blocks/tests/)
bun run doctor    # run the plugin doctor checks
bun run health    # run the local-health sensor check
```

The content test validates frontmatter against the v2 stage/sensor/agent schema,
the stage graph (`requires_stage` + produce/consume consistency), overlay
targets against real core stage slugs, stage scopes against real core scopes,
the agent stem/name match, and the sensor → tool reference — so a rename or a
broken cross-reference fails CI.

## Contributing

- Keep each stage's frontmatter consistent with the artifact vocabulary
  (`produces` / `consumes`) — the content test enforces it.
- Block API details live in the `@aws-blocks/blocks` package steering files;
  the knowledge docs here summarize and reference them rather than duplicating.
- Prefer a Block over a raw CDK escape hatch; document any escape hatch in the
  Domain Design **CDK Extensions** subsection.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
