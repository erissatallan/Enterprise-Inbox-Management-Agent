# Project Brief

## Problem framing

Enterprise teams lose time when requests arrive through fragmented channels and humans must manually triage, route, and trigger follow-up tasks. Typical failure modes:
- Slow response and missed SLAs
- Incorrect routing to owners
- Inconsistent handling of repeat request types
- Weak auditability of what was done and why

This project builds an AI agent system that converts incoming messages into structured, policy-aware workflow actions.

## Objective

Deliver a 14-day MVP that demonstrates measurable operational value and can be shown on portfolio/GitHub as a business-ready AI system.

## Primary user and beneficiary

- Primary user: operations manager or team lead handling shared inbox/workstream
- Beneficiary: operations, RevOps, support, onboarding, and back-office teams

## In-scope (cycle 1)

- Ingestion from one simulated inbox/event feed (JSON messages)
- Message normalization into a canonical schema
- AI triage: intent classification, priority estimation, and entity extraction
- Policy check layer (allow/deny/require-human-review)
- Tool-action execution for a small tool set (for example: create task, update CRM-style record, send reply draft)
- Human-in-the-loop approval mode for medium/low confidence actions
- Full trace logging and per-message decision report
- Evaluation harness against labeled validation set

## Out of scope (cycle 1)

- Multi-tenant production deployment
- Real enterprise SSO/OAuth hardening
- Complex RAG over large private knowledge bases
- Full connector suite (Gmail/Outlook/Slack/Jira/etc.)

## Success metrics

- >= 80% intent classification accuracy on validation set
- >= 70% end-to-end correct action proposals
- >= 50% reduction in manual triage time (simulated benchmark)
- 100% action traceability (every action has reason + confidence + tool call log)

## Frontier AI characteristics

- Agentic planning with explicit action graph
- Tool-calling with structured outputs
- Confidence-aware autonomy (auto-execute vs review queue)
- Evaluation loop with regression checks for prompt/tool changes

## Key assumptions

- Synthetic dataset can represent realistic request variation for first proof
- One language (English) for MVP
- Tool APIs can be mocked initially to validate decision quality before deep integration

## Deliverables for the fortnight

- Runnable MVP (local)
- Sample dataset + evaluation scripts
- Demo script + short walkthrough recording
- Portfolio-ready article draft with architecture and results
