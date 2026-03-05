# Cycle 2 Integrations

## Goal

Demonstrate concrete integration with business communication channels while keeping the same policy-governed automation core.

## Implemented

- Slack event adapter (offline): `src/channels/slack.ts`
- Email thread adapter (offline): `src/channels/email.ts`
- Channel integration demo runner: `src/channel-demo.ts`
- Slack live webhook server with signature verification: `src/slack-live-server.ts`
- Slack live event utilities: `src/channels/slack-live.ts`
- Gmail live adapter + fetch utilities: `src/channels/gmail-live.ts`
- Gmail live ingestion runner: `src/gmail-live-runner.ts`
- Ticketing/CRM handoff adapters: `src/integrations-business-handoff.ts`
- Handoff demo runner: `src/handoff-demo.ts`
- Review state workflow (approve/reject/metrics):
  - `src/review-workflow.ts`
  - `src/review-demo.ts`
  - `src/review-decide.ts`
  - `src/review-metrics.ts`

## How to run

Offline multi-channel demo:

```bash
npm run demo:channels
```

Slack live webhook server:

```bash
SLACK_SIGNING_SECRET=... SLACK_OUTBOUND_MODE=mock npm run slack:live
```

Gmail ingestion (mock mode):

```bash
npm run gmail:live
```

Gmail ingestion (live mode):

```bash
GMAIL_MODE=live GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='newer_than:7d' npm run gmail:live
```

Business handoff demo:

```bash
BUSINESS_HANDOFF_MODE=mock TICKETING_PROVIDER=jira CRM_PROVIDER=hubspot npm run demo:handoff
```

Review workflow demo and decisions:

```bash
npm run demo:review
REVIEW_MESSAGE_ID=<id> REVIEW_DECISION=APPROVED REVIEWER_NAME=<name> npm run review:decide
npm run review:metrics
```

## Generated artifacts

- `reports/channel-integration-demo.md`
- `reports/channel-integration-demo.json`
- `reports/gmail-live-demo.md`
- `reports/gmail-live-demo.json`
- `reports/handoff-demo.md`
- `reports/handoff-demo.json`
- `reports/review-workflow.md`
- `reports/review-metrics.md`
- `reports/review-metrics.json`
- `logs/review-items.jsonl`
- `logs/review-decisions.jsonl`

## What is demonstrable now

- One canonical ingestion contract can absorb Slack and email-originating payloads.
- Slack can be connected in live webhook mode with signed requests.
- Gmail can be ingested in both mock and live API modes through the same policy path.
- Policy-approved actions can hand off to ticketing and CRM adapters.
- Review-required items now support explicit human approve/reject decisions and auditable review metrics.

## Next ordered step

Cycle 2 is complete. Next cycle should focus on production hardening: real provider endpoints, auth lifecycle management, retry/idempotency guarantees, and deployment automation.
