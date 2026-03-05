import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadJsonlMessages } from "./ingestion.js";
import { processMessage } from "./pipeline.js";
import {
  buildReviewItemsFromResults,
  writeReviewItems,
  reviewMetrics,
  applyReviewDecisions,
} from "./review-workflow.js";

async function run(): Promise<void> {
  const dataPath = resolve(process.cwd(), "data/messages_sample.jsonl");
  const auditPath = resolve(process.cwd(), "logs/audit-review-demo.jsonl");
  const reviewItemsPath = resolve(process.cwd(), "logs/review-items.jsonl");
  const reviewDecisionsPath = resolve(process.cwd(), "logs/review-decisions.jsonl");
  const reportPath = resolve(process.cwd(), "reports/review-workflow.md");

  const messages = await loadJsonlMessages(dataPath);
  const results = [];

  for (const message of messages) {
    const result = await processMessage(message, auditPath);
    results.push(result);
  }

  const reviewItems = buildReviewItemsFromResults(results);
  await writeReviewItems(reviewItemsPath, reviewItems);
  await writeFile(reviewDecisionsPath, "", "utf8");

  const stateRows = applyReviewDecisions(reviewItems, []);
  const metrics = reviewMetrics(stateRows);

  const lines = [
    "# Review Workflow Demo",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    `Pending review items: ${metrics.pending}`,
    "",
    "## Next actions",
    "",
    "1. Run a decision command for each message:",
    "   REVIEW_MESSAGE_ID=<id> REVIEW_DECISION=APPROVED|REJECTED REVIEWER_NAME=<name> npm run review:decide",
    "2. Recompute metrics:",
    "   npm run review:metrics",
    "",
    "## Artifacts",
    "",
    `- Review items: ${reviewItemsPath}`,
    `- Review decisions: ${reviewDecisionsPath}`,
  ];

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Wrote ${reportPath}`);
}

run().catch((error) => {
  console.error("Review demo failed:", error);
  process.exitCode = 1;
});
