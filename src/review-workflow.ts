import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import type { PipelineResult } from "./pipeline.js";

export const reviewItemSchema = z.object({
  review_id: z.string(),
  message_id: z.string(),
  created_at: z.string(),
  intent_label: z.string(),
  priority_label: z.enum(["low", "medium", "high"]),
  confidence: z.number(),
  policy_reason: z.string(),
  proposed_actions: z.array(
    z.object({
      tool_name: z.enum(["create_task", "draft_reply", "reply", "update_record"]),
      args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    }),
  ),
});

export const reviewDecisionSchema = z.object({
  message_id: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewer: z.string(),
  note: z.string().optional(),
  decided_at: z.string(),
});

export type ReviewItem = z.infer<typeof reviewItemSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export type ReviewStateRow = {
  message_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewer?: string;
  decided_at?: string;
  note?: string;
};

export function buildReviewItemsFromResults(results: PipelineResult[]): ReviewItem[] {
  return results
    .filter((result) => result.policy_decision === "REQUIRE_REVIEW")
    .map((result) =>
      reviewItemSchema.parse({
        review_id: `rev_${result.message_id}`,
        message_id: result.message_id,
        created_at: new Date().toISOString(),
        intent_label: result.intent_label,
        priority_label: result.priority_label,
        confidence: result.confidence,
        policy_reason: result.policy_reason,
        proposed_actions: result.proposed_actions,
      }),
    );
}

export async function writeReviewItems(path: string, items: ReviewItem[]): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  const body = items.map((item) => JSON.stringify(item)).join("\n");
  await writeFile(path, `${body}${body ? "\n" : ""}`, "utf8");
}

export async function readJsonl<T>(path: string, parser: z.ZodType<T>): Promise<T[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return [];
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parser.parse(JSON.parse(line) as unknown));
}

export async function appendReviewDecision(path: string, decision: ReviewDecision): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await appendFile(path, `${JSON.stringify(reviewDecisionSchema.parse(decision))}\n`, "utf8");
}

export function applyReviewDecisions(items: ReviewItem[], decisions: ReviewDecision[]): ReviewStateRow[] {
  const latest = new Map<string, ReviewDecision>();

  for (const decision of decisions) {
    const existing = latest.get(decision.message_id);
    if (!existing || existing.decided_at < decision.decided_at) {
      latest.set(decision.message_id, decision);
    }
  }

  return items.map((item) => {
    const latestDecision = latest.get(item.message_id);
    if (!latestDecision) {
      return {
        message_id: item.message_id,
        status: "PENDING",
      } satisfies ReviewStateRow;
    }

    return {
      message_id: item.message_id,
      status: latestDecision.decision,
      reviewer: latestDecision.reviewer,
      decided_at: latestDecision.decided_at,
      note: latestDecision.note,
    } satisfies ReviewStateRow;
  });
}

export function reviewMetrics(rows: ReviewStateRow[]) {
  const total = rows.length;
  const approved = rows.filter((row) => row.status === "APPROVED").length;
  const rejected = rows.filter((row) => row.status === "REJECTED").length;
  const pending = rows.filter((row) => row.status === "PENDING").length;

  return {
    total,
    approved,
    rejected,
    pending,
    approval_rate: total > 0 ? Number(((approved / total) * 100).toFixed(2)) : 0,
    rejection_rate: total > 0 ? Number(((rejected / total) * 100).toFixed(2)) : 0,
    pending_rate: total > 0 ? Number(((pending / total) * 100).toFixed(2)) : 0,
  };
}
