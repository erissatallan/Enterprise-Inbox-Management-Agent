import test from "node:test";
import assert from "node:assert/strict";

import { applyReviewDecisions, buildReviewItemsFromResults, reviewMetrics } from "../src/review-workflow.js";
import type { PipelineResult } from "../src/pipeline.js";

function mkResult(messageId: string): PipelineResult {
  return {
    message_id: messageId,
    intent_label: "access_request",
    priority_label: "high",
    confidence: 0.75,
    policy_decision: "REQUIRE_REVIEW",
    policy_reason: "review",
    proposed_actions: [{ tool_name: "create_task", args: { queue: "it-access", severity: "high" } }],
    tool_results: [],
  };
}

test("applyReviewDecisions keeps unresolved items as pending", () => {
  const items = buildReviewItemsFromResults([mkResult("m1")]);
  const rows = applyReviewDecisions(items, []);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.status, "PENDING");
});

test("applyReviewDecisions uses latest decision per message", () => {
  const items = buildReviewItemsFromResults([mkResult("m1")]);
  const rows = applyReviewDecisions(items, [
    { message_id: "m1", decision: "REJECTED", reviewer: "A", decided_at: "2026-03-04T09:00:00Z" },
    { message_id: "m1", decision: "APPROVED", reviewer: "B", decided_at: "2026-03-04T10:00:00Z" },
  ]);

  assert.equal(rows[0]?.status, "APPROVED");
  assert.equal(rows[0]?.reviewer, "B");
});

test("reviewMetrics computes approval/rejection/pending rates", () => {
  const metrics = reviewMetrics([
    { message_id: "1", status: "APPROVED" },
    { message_id: "2", status: "REJECTED" },
    { message_id: "3", status: "PENDING" },
    { message_id: "4", status: "APPROVED" },
  ]);

  assert.equal(metrics.total, 4);
  assert.equal(metrics.approved, 2);
  assert.equal(metrics.rejected, 1);
  assert.equal(metrics.pending, 1);
  assert.equal(metrics.approval_rate, 50);
});
