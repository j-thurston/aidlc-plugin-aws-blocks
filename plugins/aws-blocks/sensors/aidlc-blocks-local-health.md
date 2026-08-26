---
id: blocks-local-health
plugin: aws-blocks
description: Verifies the local AWS Blocks dev environment is healthy
trigger: stage-entry
stages: [blocks-local-dev, build-and-test]
severity: error
tool: aidlc-blocks-local-health.ts
---

## Check

Runs `tools/aidlc-blocks-local-health.ts` to verify the local AWS Blocks dev
environment before a Blocks stage begins:

- Node.js >= 20 available
- `@aws-blocks/blocks` package resolved in `node_modules`
- IFC layer present (`aws-blocks/index.ts`)

Output: JSON `{ checks: [{ pass, label, fix?, severity? }] }`. A failing
`error`-severity check blocks stage entry; `advisory` checks warn but do not
block.
