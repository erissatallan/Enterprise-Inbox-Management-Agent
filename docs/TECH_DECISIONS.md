# Technical Decisions (Cycle 1)

Date locked: 2026-03-03

## Decision 1: Runtime and server

- Choice: Node.js + TypeScript, minimal CLI-first execution
- Reason: fastest path to a demonstrable, testable pipeline with low setup overhead
- Revisit trigger: when external integrations and dashboard need persistent API service

## Decision 2: Orchestration model

- Choice: custom deterministic pipeline (ingest -> normalize -> decide -> policy -> tools)
- Reason: easier to debug and audit than framework orchestration in first cycle
- Revisit trigger: when workflow branching and multi-agent interactions become complex

## Decision 3: Model provider mode

- Choice: `heuristic` default for reproducible local runs; provider abstraction kept for future model calls
- Reason: avoids API dependency while building policy/tooling/eval foundations
- Revisit trigger: after baseline eval scripts are in place and regression checks added

## Decision 4: Data and privacy

- Choice: synthetic JSONL dataset only in cycle 1
- Reason: avoids handling sensitive customer data in early prototype
- Revisit trigger: after data governance and anonymization process are documented

## Decision 5: Demo target

- Choice: local runnable demo + recorded walkthrough video in cycle 1
- Reason: fastest publishable artifact with clear reproducibility path
- Revisit trigger: after metrics stabilize and a hosted preview can be supported
