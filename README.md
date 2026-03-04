# Enterprise Inbox-to-Workflow Agent

Business-first applied AI project that converts high-volume enterprise inbox traffic into reliable, auditable workflow execution.

## Current status

Cycle 1 includes:
- JSONL inbox ingestion and normalization
- intent/priority/action decision engine (heuristic baseline)
- policy gating (`AUTO_EXECUTE`, `REQUIRE_REVIEW`, `DENY`)
- mock tool execution with audit logging
- evaluation harness with reproducible metrics
- demo/review queue artifacts for portfolio walkthroughs

## Quick start

```bash
npm install
npm run dev
```

Useful commands:
- `npm run typecheck`
- `npm run test`
- `npm run demo`
- `npm run eval`
- `npm run build`

## Demo + evaluation

```bash
npm run demo
npm run eval
```

Outputs:
- Demo summary: `reports/demo-summary.md`
- Review queue report: `reports/review-queue.md`
- Review queue payload: `reports/review-queue.json`
- Evaluation report: `reports/eval-report.md`
- Evaluation metrics JSON: `reports/eval-report.json`
- Audit trace: `logs/audit.jsonl`

## Project structure

- `src/`: runnable MVP modules
- `src/evaluate.ts`: evaluation harness
- `src/demo.ts`: demo artifact generator
- `src/review-report.ts`: review queue report generator
- `data/messages_sample.jsonl`: sample inbox events
- `data/messages_val.jsonl`: labeled validation set
- `docs/ARCHITECTURE.md`: architecture details and contracts
- `docs/ARCHITECTURE_DIAGRAM.md`: Mermaid architecture diagram
- `docs/DECISION_EXAMPLES.md`: concrete decision traces
- `docs/DEMO_RUNBOOK.md`: short demo script

## MVP boundary (cycle 1)

Use synthetic inbox events only. Keep connectors modular so Gmail/Outlook/Slack/Jira/CRM integrations can be added in cycle 2.
