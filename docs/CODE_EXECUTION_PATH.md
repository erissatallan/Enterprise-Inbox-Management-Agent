# Code Execution Path (Non-Technical Walkthrough)

This document explains what happens when the system runs, from start to finish, using plain language.

## What this project does

The project reads incoming business messages (for example from chat or email), decides what kind of request each message is, and then either:
- handles it automatically, or
- sends it for human review.

At every step, it keeps an audit record so decisions can be traced.

## The main flow (same for all channels)

1. A message arrives
- Source can be sample files, Slack events, or Gmail payloads.

2. Message is converted into a common format
- Different channels use different structures.
- Adapters convert them into one shared message format.

3. Message is cleaned and prepared
- Text is normalized so the decision engine can read it consistently.

4. Decision is made
- System predicts intent, priority, and suggested action(s).

5. Policy gate is applied
- The policy decides one of three outcomes:
  - `AUTO_EXECUTE`
  - `REQUIRE_REVIEW`
  - `DENY`

6. Business handoff is triggered when allowed
- If auto-approved, the system can create/update external business records.
- In this cycle: ticketing and CRM handoff adapters are included.

7. Human review state is managed
- If review is required, items enter `PENDING` state.
- A reviewer explicitly marks each as `APPROVED` or `REJECTED`.
- Review decisions are logged and summarized.

8. Everything is logged
- The system writes audit logs for normalization, decision, policy, and tool/handoff execution.

9. Reports are generated
- Demo and evaluation scripts produce summary files for presentation.

## How to run it (current cycle)

### A) Core local pipeline demo
Command:
```bash
npm run demo
```

### B) Multi-channel demo (Slack + Email sample inputs)
Command:
```bash
npm run demo:channels
```

### C) Slack live webhook mode
Command:
```bash
SLACK_SIGNING_SECRET=... SLACK_OUTBOUND_MODE=mock npm run slack:live
```

### D) Gmail live ingestion mode
Command (mock mode):
```bash
npm run gmail:live
```
Command (live Gmail ingestion only):
```bash
GMAIL_MODE=live GMAIL_REPLY_MODE=mock GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='newer_than:7d' npm run gmail:live
```
Command (controlled live Gmail reply):
```bash
GMAIL_MODE=live GMAIL_REPLY_MODE=live GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='subject:"[AGENT-LIVE-TEST]" newer_than:1d' GMAIL_REPLY_ALLOWLIST='your-test-sender@example.com' npm run gmail:live
```

### E) Business handoff demo (ticketing + CRM)
Command:
```bash
BUSINESS_HANDOFF_MODE=mock TICKETING_PROVIDER=jira CRM_PROVIDER=hubspot npm run demo:handoff
```

### F) Review workflow demo and decisions
Command sequence:
```bash
npm run demo:review
REVIEW_MESSAGE_ID=<id> REVIEW_DECISION=APPROVED REVIEWER_NAME=<name> npm run review:decide
npm run review:metrics
```

Review artifacts:
- `logs/review-items.jsonl`
- `logs/review-decisions.jsonl`
- `reports/review-workflow.md`
- `reports/review-metrics.md`

### G) Accuracy/evaluation report
Command:
```bash
npm run eval
```

## Where decisions happen in code

- Channel adapters: `src/channels/`
- Main processing flow: `src/pipeline.ts`
- Policy logic: `src/policy.ts`
- Handoff adapters: `src/integrations-business-handoff.ts`
- Review lifecycle: `src/review-workflow.ts`
- Demo runners: `src/demo.ts`, `src/channel-demo.ts`, `src/gmail-live-runner.ts`, `src/handoff-demo.ts`, `src/review-demo.ts`
- Slack live server: `src/slack-live-server.ts`

## How to read outputs quickly

1. Start with `reports/demo-summary.md`.
2. Open `reports/channel-integration-demo.md`, `reports/gmail-live-demo.md`, and `reports/handoff-demo.md`.
3. Open `reports/review-workflow.md` and `reports/review-metrics.md` for human-review governance.
4. Open `reports/eval-report.md` for quality metrics.
5. Open `logs/*.jsonl` for full traceability.

## Current cycle status note

This document reflects the current implementation state in Cycle 2 and is updated as new execution paths are added.
