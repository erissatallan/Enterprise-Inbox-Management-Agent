import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { InboundMessage } from "./schemas.js";
import type { PipelineResult } from "./pipeline.js";

function toPct(value: number, total: number): string {
  if (total === 0) {
    return "0.00%";
  }
  return `${((value / total) * 100).toFixed(2)}%`;
}

export function renderReviewQueueMarkdown(
  messages: InboundMessage[],
  results: PipelineResult[],
): string {
  const byId = new Map(messages.map((message) => [message.message_id, message]));
  const reviewItems = results.filter(
    (result) => result.policy_decision === "REQUIRE_REVIEW" || result.policy_decision === "DENY",
  );

  const autoExecuteCount = results.filter((result) => result.policy_decision === "AUTO_EXECUTE").length;
  const reviewCount = results.filter((result) => result.policy_decision === "REQUIRE_REVIEW").length;
  const denyCount = results.filter((result) => result.policy_decision === "DENY").length;

  const lines = [
    "# Review Queue Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Processed messages: ${results.length}`,
    `Auto-execute: ${autoExecuteCount} (${toPct(autoExecuteCount, results.length)})`,
    `Require review: ${reviewCount} (${toPct(reviewCount, results.length)})`,
    `Denied: ${denyCount} (${toPct(denyCount, results.length)})`,
    "",
    "## Review items",
    "",
  ];

  if (reviewItems.length === 0) {
    lines.push("No blocked or review-queued messages.");
    return lines.join("\n");
  }

  for (const item of reviewItems) {
    const message = byId.get(item.message_id);
    const primaryAction = item.proposed_actions[0];

    lines.push(`### ${item.message_id}`);
    lines.push(`- Subject: ${message?.subject ?? "Unknown"}`);
    lines.push(`- Sender: ${message?.sender ?? "Unknown"}`);
    lines.push(`- Intent: ${item.intent_label}`);
    lines.push(`- Priority: ${item.priority_label}`);
    lines.push(`- Confidence: ${item.confidence.toFixed(2)}`);
    lines.push(`- Policy: ${item.policy_decision}`);
    lines.push(`- Policy reason: ${item.policy_reason}`);
    lines.push(
      `- Suggested primary action: ${primaryAction ? `${primaryAction.tool_name} ${JSON.stringify(primaryAction.args)}` : "None"}`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

export async function writeReviewQueueReport(
  messages: InboundMessage[],
  results: PipelineResult[],
): Promise<{ markdownPath: string; jsonPath: string }> {
  const reportsDir = resolve(process.cwd(), "reports");
  const markdownPath = resolve(reportsDir, "review-queue.md");
  const jsonPath = resolve(reportsDir, "review-queue.json");

  const reviewItems = results.filter(
    (result) => result.policy_decision === "REQUIRE_REVIEW" || result.policy_decision === "DENY",
  );

  const byId = new Map(messages.map((message) => [message.message_id, message]));
  const payload = reviewItems.map((item) => ({
    message_id: item.message_id,
    subject: byId.get(item.message_id)?.subject ?? null,
    sender: byId.get(item.message_id)?.sender ?? null,
    policy_decision: item.policy_decision,
    policy_reason: item.policy_reason,
    intent_label: item.intent_label,
    priority_label: item.priority_label,
    confidence: item.confidence,
    proposed_actions: item.proposed_actions,
  }));

  await mkdir(reportsDir, { recursive: true });
  await writeFile(markdownPath, `${renderReviewQueueMarkdown(messages, results)}\n`, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return { markdownPath, jsonPath };
}
