# Implementation Plan (14 days)

## Day 1-2: Foundations

- Set up repo scaffolding and TypeScript project
- Define core schemas (`InboundMessage`, `NormalizedMessage`, `AgentDecision`, `ToolAction`)
- Create synthetic dataset starter (100-200 messages across 6-8 intents)
- Implement ingestion + normalization pipeline

Exit criteria:
- Can ingest dataset and emit normalized records consistently

## Day 3-5: Agent core

- Implement structured classification/extraction call
- Build prompt template with strict output contract
- Add confidence scoring and fallback behavior
- Create baseline tests for intent/entity parsing

Exit criteria:
- Agent returns valid structured output on >= 95% of samples

## Day 6-7: Policy + tool execution

- Implement allow/deny/review policy engine
- Build mock tool adapters (`create_task`, `draft_reply`, `update_record`)
- Add idempotency and schema validation on tool calls

Exit criteria:
- End-to-end run from message -> decision -> action/review works locally

## Day 8-9: Evaluation and hardening

- Build evaluation script with labeled validation set
- Measure intent accuracy, action correctness, review rate, latency
- Tune thresholds and prompt

Exit criteria:
- Metrics generated in reproducible report file

## Day 10-11: Demo and UX

- Add simple review interface or CLI report for blocked/review items
- Record a clean demo scenario with before/after operational flow

Exit criteria:
- Usable demo path for portfolio reviewers in under 5 minutes

## Day 12-13: Write-up assets

- Capture architecture diagram and decision examples
- Draft article with business framing and implementation details
- Prepare README with setup/run/eval instructions

Exit criteria:
- Publication-ready long-form draft

## Day 14: Publish and distribute

- Push GitHub repo
- Publish portfolio project page
- Publish blog article
- Cross-post short launch notes to LinkedIn and Indie Hackers

Exit criteria:
- Public links live and internally consistent

## Scope controls

- Do not add new connectors during cycle 1
- Do not optimize for scale before evaluation quality is acceptable
- Prefer deterministic guardrails over broad autonomy

## Verification plan

- Unit tests for schemas, policy decisions, and tool validators
- Integration test for full pipeline on fixture dataset
- Regression eval run before every major prompt/policy change
