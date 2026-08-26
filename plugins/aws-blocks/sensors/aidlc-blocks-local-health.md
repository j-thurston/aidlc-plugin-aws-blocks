---
id: blocks-local-health
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/aidlc-blocks-local-health.ts
default_severity: blocking
description: Verifies the local AWS Blocks dev environment is healthy (Node >= 20, @aws-blocks/blocks resolved, IFC layer present) before a Blocks stage begins (aws-blocks plugin)
category: environment
matches: "**/aws-blocks/**"
input_schema:
  project_dir: string
output_schema:
  checks:
    - pass: boolean
      label: string
      fix: string
      severity: string
---

## Check

Runs `tools/aidlc-blocks-local-health.ts` to verify the local AWS Blocks dev
environment. Bound to the `aws-blocks-local-dev` and `build-and-test` stages via
those stages' `sensors:` lists. Verifies:

- Node.js >= 20 available
- `@aws-blocks/blocks` package resolved in `node_modules`
- IFC layer present (`aws-blocks/index.ts`)

Output: JSON `{ checks: [{ pass, label, fix?, severity? }] }`. 
`blocking` check blocks stage entry; `advisory` checks warn but do not
block.
