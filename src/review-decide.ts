import "dotenv/config";

import { resolve } from "node:path";

import {
  appendReviewDecision,
  readJsonl,
  reviewDecisionSchema,
  reviewItemSchema,
  applyReviewDecisions,
  reviewMetrics,
} from "./review-workflow.js";

async function run(): Promise<void> {
  const messageId = process.env.REVIEW_MESSAGE_ID;
  const decision = process.env.REVIEW_DECISION;
  const reviewer = process.env.REVIEWER_NAME ?? "reviewer";
  const note = process.env.REVIEW_NOTE;

  if (!messageId) {
    throw new Error("Missing REVIEW_MESSAGE_ID.");
  }

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new Error("REVIEW_DECISION must be APPROVED or REJECTED.");
  }

  const itemsPath = resolve(process.cwd(), "logs/review-items.jsonl");
  const decisionsPath = resolve(process.cwd(), "logs/review-decisions.jsonl");

  const items = await readJsonl(itemsPath, reviewItemSchema);
  const exists = items.some((item) => item.message_id === messageId);
  if (!exists) {
    throw new Error(`Message ${messageId} not found in review queue.`);
  }

  await appendReviewDecision(decisionsPath, {
    message_id: messageId,
    decision,
    reviewer,
    note,
    decided_at: new Date().toISOString(),
  });

  const decisions = await readJsonl(decisionsPath, reviewDecisionSchema);
  const rows = applyReviewDecisions(items, decisions);
  const metrics = reviewMetrics(rows);

  console.log(`Saved decision for ${messageId}: ${decision}`);
  console.log(JSON.stringify(metrics, null, 2));
}

run().catch((error) => {
  console.error("Review decision failed:", error);
  process.exitCode = 1;
});
