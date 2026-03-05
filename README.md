# Enterprise Inbox-to-Workflow Agent

Business-first applied AI project that converts high-volume enterprise inbox traffic into reliable, auditable workflow execution.

## Current status

Cycle 1 + Cycle 2 now include:
- JSONL inbox ingestion and normalization
- intent/priority/action decision engine (heuristic baseline)
- policy gating (`AUTO_EXECUTE`, `REQUIRE_REVIEW`, `DENY`)
- mock tool execution with audit logging
- evaluation harness with reproducible metrics
- demo/review queue artifacts for portfolio walkthroughs
- offline channel adapters for Slack events and email threads
- Slack live webhook integration with request signature verification
- Gmail live ingestion runner with mock/live API mode
- ticketing and CRM business handoff adapters
- explicit human review state workflow (`PENDING`, `APPROVED`, `REJECTED`)

## Quick start

```bash
npm install
npm run dev
```

Useful commands:
- `npm run typecheck`
- `npm run test`
- `npm run demo`
- `npm run demo:channels`
- `npm run slack:live`
- `npm run gmail:live`
- `npm run demo:handoff`
- `npm run demo:review`
- `npm run review:decide`
- `npm run review:metrics`
- `npm run eval`
- `npm run build`

## Demo + evaluation

```bash
npm run demo
npm run demo:channels
npm run gmail:live
npm run demo:handoff
npm run demo:review
npm run review:metrics
npm run eval
```

Outputs:
- Demo summary: `reports/demo-summary.md`
- Review queue report: `reports/review-queue.md`
- Channel integration demo: `reports/channel-integration-demo.md`
- Gmail integration demo: `reports/gmail-live-demo.md`
- Business handoff demo: `reports/handoff-demo.md`
- Review workflow: `reports/review-workflow.md`
- Review metrics: `reports/review-metrics.md`
- Evaluation report: `reports/eval-report.md`

## Project structure

- `src/slack-live-server.ts`: live Slack webhook ingestion server
- `src/gmail-live-runner.ts`: Gmail ingestion runner
- `src/integrations-business-handoff.ts`: ticketing/CRM adapter layer
- `src/review-workflow.ts`: human review state and metrics model
- `docs/CODE_EXECUTION_PATH.md`: non-technical execution walkthrough
- `docs/INSTALLATION_TUTORIAL.md`: non-technical workplace setup by integration platform
- `docs/CYCLE2_IMPLEMENTATION_PLAN.md`: ordered cycle plan and done criteria

## MVP boundary

Use synthetic inbox events in this repository. Keep connectors modular so Slack/Gmail/Outlook/Jira/CRM live adapters can be added with limited core changes.
