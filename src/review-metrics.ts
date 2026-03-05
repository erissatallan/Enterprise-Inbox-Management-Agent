import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  readJsonl,
  reviewItemSchema,
  reviewDecisionSchema,
  applyReviewDecisions,
  reviewMetrics,
} from "./review-workflow.js";

async function run(): Promise<void> {
  const itemsPath = resolve(process.cwd(), "logs/review-items.jsonl");
  const decisionsPath = resolve(process.cwd(), "logs/review-decisions.jsonl");
  const reportMdPath = resolve(process.cwd(), "reports/review-metrics.md");
  const reportJsonPath = resolve(process.cwd(), "reports/review-metrics.json");

  const items = await readJsonl(itemsPath, reviewItemSchema);
  const decisions = await readJsonl(decisionsPath, reviewDecisionSchema);

  const rows = applyReviewDecisions(items, decisions);
  const metrics = reviewMetrics(rows);

  const payload = {
    generated_at: new Date().toISOString(),
    metrics,
    rows,
  };

  const lines = [
    "# Review Metrics",
    "",
    `Generated at: ${payload.generated_at}`,
    "",
    `- Total review items: ${metrics.total}`,
    `- Approved: ${metrics.approved} (${metrics.approval_rate}%)`,
    `- Rejected: ${metrics.rejected} (${metrics.rejection_rate}%)`,
    `- Pending: ${metrics.pending} (${metrics.pending_rate}%)`,
  ];

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(reportMdPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${reportMdPath}`);
  console.log(`Wrote ${reportJsonPath}`);
}

run().catch((error) => {
  console.error("Review metrics failed:", error);
  process.exitCode = 1;
});
