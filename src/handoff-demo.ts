import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadJsonlMessages } from "./ingestion.js";
import { processMessage } from "./pipeline.js";

async function run(): Promise<void> {
  const dataPath = resolve(process.cwd(), "data/messages_sample.jsonl");
  const auditPath = resolve(process.cwd(), "logs/audit-handoff-demo.jsonl");
  const reportPath = resolve(process.cwd(), "reports/handoff-demo.md");
  const reportJsonPath = resolve(process.cwd(), "reports/handoff-demo.json");

  const messages = await loadJsonlMessages(dataPath);
  const results = [];

  for (const message of messages) {
    const result = await processMessage(message, auditPath);
    results.push(result);
  }

  const payload = {
    generated_at: new Date().toISOString(),
    business_handoff_mode: process.env.BUSINESS_HANDOFF_MODE === "live" ? "live" : "mock",
    ticketing_provider: process.env.TICKETING_PROVIDER ?? "jira",
    crm_provider: process.env.CRM_PROVIDER ?? "hubspot",
    results,
  };

  const lines = [
    "# Business Handoff Demo",
    "",
    `Generated at: ${payload.generated_at}`,
    `Mode: ${payload.business_handoff_mode}`,
    `Ticketing provider: ${payload.ticketing_provider}`,
    `CRM provider: ${payload.crm_provider}`,
    "",
    "## Tool execution highlights",
    "",
  ];

  for (const result of results) {
    const toolDetails = result.tool_results.map((tool) => tool.detail).join(" | ") || "No auto-executed tools";
    lines.push(`- ${result.message_id}: ${result.policy_decision} -> ${toolDetails}`);
  }

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${reportPath}`);
  console.log(`Wrote ${reportJsonPath}`);
}

run().catch((error) => {
  console.error("Handoff demo failed:", error);
  process.exitCode = 1;
});
