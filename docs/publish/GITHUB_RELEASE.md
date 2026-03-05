# GitHub Release Draft

## Title

Enterprise Inbox-to-Workflow Agent v0.1.0 - Policy-Gated AI Workflow Automation MVP

## Release notes

This release ships a business-first AI operations MVP that converts unstructured inbound inbox traffic into auditable workflow actions.

### Included

- End-to-end pipeline: ingest -> normalize -> decide -> policy -> tool actions
- Policy gates: `AUTO_EXECUTE`, `REQUIRE_REVIEW`, `DENY`
- Mock business tools: `create_task`, `draft_reply`, `update_record`
- Full audit trail logging for each pipeline stage
- Evaluation harness with reproducible metrics report
- Demo runner generating review queue and before/after operations summary
- Unit + integration tests for policy and pipeline behavior

### Baseline metrics (validation set)

- Intent accuracy: `91.67%`
- Priority accuracy: `100%`
- Action correctness (primary tool): `100%`
- Policy accuracy: `91.67%`
- Review rate: `58.33%`
- Auto-execute rate: `41.67%`
- Deny rate: `0%`

### Quick run

```bash
npm install
npm run typecheck
npm run test
npm run demo
npm run eval
```

### Generated artifacts

- `reports/demo-summary.md`
- `reports/review-queue.md`
- `reports/review-queue.json`
- `reports/eval-report.md`
- `reports/eval-report.json`
- `logs/audit.jsonl`

### Next

- LLM structured-output adapter with schema-validated tool calls
- Larger validation dataset and confusion-matrix reporting
- Lightweight reviewer UI for human approvals
