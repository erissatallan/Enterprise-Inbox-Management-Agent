# Architecture

## System overview

Pipeline:
1. Ingest message event
2. Normalize to canonical schema
3. Agent analyzes intent, priority, and entities
4. Policy engine decides autonomy level
5. Tool executor performs action or queues for review
6. Logger writes full audit trace
7. Evaluator scores outcomes offline

## Component design

### 1) Ingestion layer

Responsibilities:
- Receive message objects from local file stream/API stub
- Deduplicate by external id
- Persist raw payload

Output contract (`InboundMessage`):
- `message_id: string`
- `source: "email" | "chat" | "form"`
- `subject: string`
- `body: string`
- `sender: string`
- `received_at: string (ISO8601)`
- `attachments_meta: object[]`

### 2) Normalization layer

Responsibilities:
- Clean HTML/noise
- Extract basic metadata
- Build consistent text context for model

Output contract (`NormalizedMessage`):
- `message_id`
- `clean_text`
- `channel`
- `sender_role` (if inferred)
- `language`
- `thread_context` (optional)

### 3) Decision agent

Responsibilities:
- Predict `intent`
- Estimate `priority`
- Extract entities needed for actions
- Propose action plan in structured JSON

Output contract (`AgentDecision`):
- `intent_label`
- `priority_label`
- `entities`
- `proposed_actions[]`
- `confidence` (0-1)
- `rationale_summary`

### 4) Policy and guardrails

Responsibilities:
- Enforce allow/deny rules by intent and action type
- Route uncertain cases to human review queue
- Block high-risk actions without explicit approval

Decision outcomes:
- `AUTO_EXECUTE`
- `REQUIRE_REVIEW`
- `DENY`

### 5) Tool executor

Initial tools:
- `create_task`
- `draft_reply`
- `update_record`

Requirements:
- Strict schema validation before tool invocation
- Idempotency keys for retriable calls
- Structured error handling

### 6) Audit log and observability

Log per message:
- Raw input hash
- Model version/prompt version
- Parsed decision
- Policy result
- Tool calls and responses
- Final status and latency

### 7) Evaluation harness

Evaluations:
- Intent accuracy
- Priority accuracy
- Entity extraction F1 (for selected fields)
- Action-plan correctness
- Human-review rate

## Suggested technical stack (fast path)

- Runtime: Node.js + TypeScript
- API/service: Fastify or Express
- Orchestration: simple internal state machine first, optional LangGraph later
- Model access: OpenAI Responses API (structured output)
- Storage: SQLite (messages, decisions, traces)
- Queue: in-process queue for MVP
- Frontend (optional): minimal review dashboard

## Data model (minimal)

Tables/collections:
- `messages`
- `decisions`
- `actions`
- `reviews`
- `evaluations`

## Risks and mitigations

- Hallucinated tool args: enforce JSON schema and default deny on invalid calls
- Over-automation risk: strict confidence thresholds + review queue
- Data leakage: synthetic/anonymized dataset only in cycle 1
- Prompt drift: keep prompt versions and run regression eval before changes
