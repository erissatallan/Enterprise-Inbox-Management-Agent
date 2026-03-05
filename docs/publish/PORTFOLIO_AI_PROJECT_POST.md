# AI Project Page Draft (for erissat.me AI Projects section)

## Page title

Enterprise Inbox-to-Workflow Agent

## Subtitle

Policy-gated AI automation for enterprise operations teams

## One-line summary

An applied AI system that converts unstructured inbound requests into auditable, policy-controlled workflow actions.

## Problem

Operations teams often manage high-volume shared inboxes where every request is manually triaged and routed. This causes slower response times, inconsistent handling, and poor visibility into why certain actions were taken.

## Solution

This project implements a deterministic AI workflow pipeline:
- `Ingest`: read inbound messages from email/chat/form-like feeds
- `Normalize`: convert noisy inputs into canonical text records
- `Decide`: predict intent, priority, and structured action plan
- `Govern`: apply policy guardrails (`AUTO_EXECUTE`, `REQUIRE_REVIEW`, `DENY`)
- `Act`: execute low-risk actions via tools
- `Audit`: log all decisions and actions for traceability

## Frontier AI aspects

- Structured outputs for action reliability
- Confidence-aware autonomy (not all-or-nothing automation)
- Human-in-the-loop routing for high-risk or uncertain cases
- Regression-oriented evaluation workflow

## Results (current baseline)

- Intent accuracy: `91.67%`
- Priority accuracy: `100%`
- Action correctness (primary tool): `100%`
- Policy accuracy: `91.67%`
- Auto-execute rate: `41.67%`
- Review rate: `58.33%`
- Deny rate: `0%`

## Why this matters for business

- Reduces manual triage load on ops teams
- Improves consistency in handling repeat request classes
- Creates auditable decision traces for governance/compliance
- Establishes a safer path to production AI automation

## Architecture snapshot

Inbound events -> Normalization -> Decision Engine -> Policy Engine -> Tool Executor / Review Queue -> Audit + Reports

## Demo proof

- Demo summary: `reports/demo-summary.md`
- Review queue report: `reports/review-queue.md`
- Evaluation report: `reports/eval-report.md`
- Audit log: `logs/audit.jsonl`

## Stack

Node.js, TypeScript, Zod, policy engine, JSONL data pipeline, deterministic tool adapters

## Links section (replace placeholders)

- GitHub: [add URL]
- Walkthrough video: [add URL]
- Blog article: [add URL]

## Suggested CTA

If your team runs high-volume operational inboxes, I can adapt this architecture to your existing ticketing/CRM/messaging stack.
