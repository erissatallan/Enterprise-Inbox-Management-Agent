import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { decideMessage } from "./agent.js";
import { normalizeMessage } from "./normalization.js";
import { evaluatePolicy } from "./policy.js";
import { inboundMessageSchema } from "./schemas.js";

const validationRecordSchema = z.object({
  message: inboundMessageSchema,
  expected_intent: z.string(),
  expected_priority: z.enum(["low", "medium", "high"]),
  expected_primary_tool: z.enum(["create_task", "draft_reply", "reply", "update_record"]),
  expected_policy: z.enum(["AUTO_EXECUTE", "REQUIRE_REVIEW", "DENY"]).optional(),
});

type ValidationRecord = z.infer<typeof validationRecordSchema>;

type EvalResult = {
  sample_count: number;
  intent_accuracy: number;
  priority_accuracy: number;
  action_correctness: number;
  policy_accuracy: number | null;
  review_rate: number;
  auto_execute_rate: number;
  deny_rate: number;
  generated_at: string;
};

async function loadValidationSet(path: string): Promise<ValidationRecord[]> {
  const raw = await readFile(path, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const parsed = JSON.parse(line) as unknown;
    try {
      return validationRecordSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Invalid validation record line ${index + 1}: ${(error as Error).message}`);
    }
  });
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function renderMarkdown(result: EvalResult): string {
  const policyAccuracy = result.policy_accuracy === null ? "N/A" : `${result.policy_accuracy}%`;

  return [
    "# Evaluation Report",
    "",
    `Generated at: ${result.generated_at}`,
    `Samples: ${result.sample_count}`,
    "",
    "## Metrics",
    "",
    `- Intent accuracy: ${result.intent_accuracy}%`,
    `- Priority accuracy: ${result.priority_accuracy}%`,
    `- Action correctness (primary tool): ${result.action_correctness}%`,
    `- Policy accuracy: ${policyAccuracy}`,
    `- Review rate: ${result.review_rate}%`,
    `- Auto-execute rate: ${result.auto_execute_rate}%`,
    `- Deny rate: ${result.deny_rate}%`,
    "",
    "## Notes",
    "",
    "- This baseline uses heuristic decision logic.",
    "- Use this report as a regression checkpoint when replacing heuristic mode with LLM structured outputs.",
  ].join("\n");
}

async function run(): Promise<void> {
  const dataPath = resolve(process.cwd(), "data/messages_val.jsonl");
  const reportJsonPath = resolve(process.cwd(), "reports/eval-report.json");
  const reportMdPath = resolve(process.cwd(), "reports/eval-report.md");

  const records = await loadValidationSet(dataPath);

  let intentCorrect = 0;
  let priorityCorrect = 0;
  let actionCorrect = 0;
  let reviewCount = 0;
  let autoExecuteCount = 0;
  let denyCount = 0;

  let policyLabeledCount = 0;
  let policyCorrect = 0;

  for (const record of records) {
    const normalized = normalizeMessage(record.message);
    const decision = await decideMessage(normalized);
    const policy = evaluatePolicy(decision);

    if (decision.intent_label === record.expected_intent) {
      intentCorrect += 1;
    }

    if (decision.priority_label === record.expected_priority) {
      priorityCorrect += 1;
    }

    const predictedTool = decision.proposed_actions[0]?.tool_name;
    if (predictedTool === record.expected_primary_tool) {
      actionCorrect += 1;
    }

    if (policy.decision === "REQUIRE_REVIEW") {
      reviewCount += 1;
    } else if (policy.decision === "AUTO_EXECUTE") {
      autoExecuteCount += 1;
    } else {
      denyCount += 1;
    }

    if (record.expected_policy) {
      policyLabeledCount += 1;
      if (policy.decision === record.expected_policy) {
        policyCorrect += 1;
      }
    }
  }

  const total = records.length;
  const result: EvalResult = {
    sample_count: total,
    intent_accuracy: toPercent(intentCorrect, total),
    priority_accuracy: toPercent(priorityCorrect, total),
    action_correctness: toPercent(actionCorrect, total),
    policy_accuracy: policyLabeledCount > 0 ? toPercent(policyCorrect, policyLabeledCount) : null,
    review_rate: toPercent(reviewCount, total),
    auto_execute_rate: toPercent(autoExecuteCount, total),
    deny_rate: toPercent(denyCount, total),
    generated_at: new Date().toISOString(),
  };

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(reportMdPath, `${renderMarkdown(result)}\n`, "utf8");

  console.log(JSON.stringify(result, null, 2));
  console.log(`Wrote ${reportJsonPath}`);
  console.log(`Wrote ${reportMdPath}`);
}

run().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exitCode = 1;
});
