# Indie Hackers Launch Post Draft

## Title

Built an inbox-to-workflow AI agent with policy guardrails (metrics included)

## Body

I shipped a local MVP for an enterprise operations problem:
turn inbound inbox messages into controlled workflow execution.

### Why

Shared inbox triage is still manual in many teams. The cost is response delay, inconsistent handling, and weak traceability.

### What it does

- Ingests inbound messages (email/chat/form style)
- Normalizes text
- Predicts intent + priority + proposed actions
- Applies policy (`AUTO_EXECUTE`, `REQUIRE_REVIEW`, `DENY`)
- Executes mock tool actions for safe cases
- Writes audit logs for every stage
- Produces review queue report for human-in-the-loop flow

### Baseline validation metrics

- Intent accuracy: 91.67%
- Priority accuracy: 100%
- Action correctness: 100%
- Policy accuracy: 91.67%
- Auto-execute rate: 41.67%
- Review rate: 58.33%

### Stack

Node.js, TypeScript, Zod, deterministic policy layer, JSONL datasets.

### Ask

If you run ops/support/revops workflows, what confidence threshold or policy design would you trust before enabling auto-execution in production?

### Links

- GitHub: [add link]
- Demo artifacts: [add link]
- Write-up: [add link]
