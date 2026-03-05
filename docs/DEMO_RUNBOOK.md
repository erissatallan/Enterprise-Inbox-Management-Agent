# Demo Runbook (Under 5 Minutes)

## Command

```bash
npm run demo
npm run eval
```

## Present in this order

1. Open `reports/demo-summary.md` for the before/after operations story.
2. Open `reports/review-queue.md` to show governance and human-review routing.
3. Open `logs/audit.jsonl` and highlight `decision`, `policy`, and `tool_execution` events.
4. Open `reports/eval-report.md` and present baseline metrics.

## Demo narrative

- Start with operational pain: all requests manually triaged.
- Show controlled autonomy: low-risk/high-confidence requests auto-execute.
- Show governance: high-risk or uncertain requests go to review with clear reasons.
- End with measurable value: accuracy and review-rate metrics.
