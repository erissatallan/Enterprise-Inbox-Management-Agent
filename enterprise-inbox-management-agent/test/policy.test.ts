import test from "node:test";
import assert from "node:assert/strict";

import { evaluatePolicy } from "../src/policy.js";
import type { AgentDecision } from "../src/schemas.js";

function mkDecision(overrides: Partial<AgentDecision>): AgentDecision {
  return {
    intent_label: "general_info",
    priority_label: "low",
    entities: {},
    proposed_actions: [{ tool_name: "draft_reply", args: { template: "general_info" } }],
    confidence: 0.7,
    rationale_summary: "test",
    ...overrides,
  };
}

test("policy requires review for high-risk intent under elevated threshold", () => {
  const decision = mkDecision({ intent_label: "access_request", confidence: 0.85 });
  const result = evaluatePolicy(decision);

  assert.equal(result.decision, "REQUIRE_REVIEW");
});

test("policy auto-executes sufficiently confident low-risk decisions", () => {
  const decision = mkDecision({ intent_label: "billing_question", confidence: 0.83, priority_label: "medium" });
  const result = evaluatePolicy(decision);

  assert.equal(result.decision, "AUTO_EXECUTE");
});

test("policy denies low-confidence decisions", () => {
  const decision = mkDecision({ confidence: 0.4 });
  const result = evaluatePolicy(decision);

  assert.equal(result.decision, "DENY");
});
