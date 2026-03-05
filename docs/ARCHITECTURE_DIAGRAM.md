# Architecture Diagram

```mermaid
flowchart LR
  A[Inbound Messages\n(email/chat/form)] --> B[Normalization Layer]
  B --> C[Decision Engine\n(intent + priority + actions)]
  C --> D[Policy Engine\nAUTO_EXECUTE/REQUIRE_REVIEW/DENY]
  D -->|AUTO_EXECUTE| E[Tool Executor\ncreate_task/draft_reply/update_record]
  D -->|REQUIRE_REVIEW or DENY| F[Review Queue Report]
  E --> G[Audit Log]
  F --> G
  G --> H[Evaluation + Demo Reports]
```

## Traceability checkpoints

- `normalized`: canonical message representation
- `decision`: model/heuristic output and confidence
- `policy`: governance decision and reason
- `tool_execution`: executed side effects (only for auto-execute)
