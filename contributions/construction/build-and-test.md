---
target: build-and-test
plugin: aws-blocks
adds:
  sensors:
    - blocks-local-health
  produces:
    - aws-blocks-test-results
fragments:
  - anchor: after-step:9
    order: 100
---

## fragment: after-step:9

### Step 9a (aws-blocks): Local integration verification

Before marking build-and-test complete, verify the local Blocks environment:

1. Run `npm run dev` (should start cleanly with no errors)
2. Execute the integration test suite against localhost:3000
3. Verify all Block-specific behaviors:
   - Database migrations applied (check `.bb-data/` directory)
   - Auth flows issue and validate local JWTs
   - FileBucket operations create/read local files
   - Agent Block responds via Ollama or configured endpoint
4. Record test results as the `aws-blocks-test-results` artifact

The `blocks-local-health` sensor runs on stage entry to confirm the local
environment is ready before verification begins.

Only proceed when all local tests pass. The sandbox deploy stage will
validate against real AWS services.
