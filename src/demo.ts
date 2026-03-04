import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { loadJsonlMessages } from "./ingestion.js";
import { processMessage } from "./pipeline.js";
import { writeReviewQueueReport } from "./review-report.js";

function formatPct(value: number, total: number): string {
  if (total === 0) {
    return "0.00%";
  }
  return `${((value / total) * 100).toFixed(2)}%`;
}

async function run(): Promise<void> {
  const dataPath = resolve(process.cwd(), "data/messages_sample.jsonl");
  const auditPath = resolve(process.cwd(), "logs/audit.jsonl");
  const demoSummaryPath = resolve(process.cwd(), "reports/demo-summary.md");

  const messages = await loadJsonlMessages(dataPath);
  const results = [];

  for (const message of messages) {
    const result = await processMessage(message, auditPath);
    results.push(result);
  }

  const autoExecute = results.filter((result) => result.policy_decision === "AUTO_EXECUTE").length;
  const requireReview = results.filter((result) => result.policy_decision === "REQUIRE_REVIEW").length;
  const denied = results.filter((result) => result.policy_decision === "DENY").length;

  const reviewPaths = await writeReviewQueueReport(messages, results);

  const summary = [
    "# Demo Summary",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Before -> After operational snapshot",
    "",
    "- Before: all inbound requests require manual triage and manual action routing.",
    `- After: ${autoExecute}/${results.length} requests auto-executed (${formatPct(autoExecute, results.length)}), ${requireReview}/${results.length} queued for review (${formatPct(requireReview, results.length)}), ${denied}/${results.length} denied (${formatPct(denied, results.length)}).`,
    "",
    "## Demo artifacts",
    "",
    `- Pipeline run output: ${results.length} processed messages`,
    `- Audit log: ${auditPath}`,
    `- Review queue report (markdown): ${reviewPaths.markdownPath}`,
    `- Review queue payload (json): ${reviewPaths.jsonPath}`,
    "",
    "## Five-minute demo flow",
    "",
    "1. Run `npm run demo`.",
    "2. Open `reports/demo-summary.md` to show high-level automation impact.",
    "3. Open `reports/review-queue.md` to show governance and human-review routing.",
    "4. Open `logs/audit.jsonl` to show full decision/action traceability.",
  ].join("\n");

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(demoSummaryPath, `${summary}\n`, "utf8");

  console.log(`Wrote ${demoSummaryPath}`);
  console.log(`Wrote ${reviewPaths.markdownPath}`);
  console.log(`Wrote ${reviewPaths.jsonPath}`);
}

run().catch((error) => {
  console.error("Demo run failed:", error);
  process.exitCode = 1;
});
