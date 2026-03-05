import "dotenv/config";

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { processMessage } from "./pipeline.js";
import { fetchGmailMessages, gmailMessageSchema, gmailMessageToInboundMessage } from "./channels/gmail-live.js";

type RunnerMode = "mock" | "live";

function pct(value: number, total: number): string {
  if (total === 0) {
    return "0.00%";
  }
  return `${((value / total) * 100).toFixed(2)}%`;
}

async function loadMockMessages(path: string) {
  const raw = await readFile(path, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => gmailMessageSchema.parse(JSON.parse(line) as unknown));
}

async function run(): Promise<void> {
  const mode = (process.env.GMAIL_MODE === "live" ? "live" : "mock") as RunnerMode;
  const maxResults = Number(process.env.GMAIL_MAX_RESULTS ?? 10);
  const query = process.env.GMAIL_QUERY ?? "newer_than:7d";

  const auditPath = resolve(process.cwd(), "logs/audit-gmail-live.jsonl");
  const reportMdPath = resolve(process.cwd(), "reports/gmail-live-demo.md");
  const reportJsonPath = resolve(process.cwd(), "reports/gmail-live-demo.json");

  let gmailMessages;
  if (mode === "live") {
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Missing GMAIL_ACCESS_TOKEN for live mode.");
    }
    gmailMessages = await fetchGmailMessages({ accessToken, maxResults, query });
  } else {
    const mockPath = resolve(process.cwd(), "data/gmail_messages_sample.jsonl");
    gmailMessages = await loadMockMessages(mockPath);
  }

  const inboundMessages = gmailMessages.map(gmailMessageToInboundMessage);

  let autoExecute = 0;
  let requireReview = 0;
  let deny = 0;

  for (const message of inboundMessages) {
    const result = await processMessage(message, auditPath);

    if (result.policy_decision === "AUTO_EXECUTE") {
      autoExecute += 1;
    } else if (result.policy_decision === "REQUIRE_REVIEW") {
      requireReview += 1;
    } else {
      deny += 1;
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    mode,
    count: inboundMessages.length,
    auto_execute: autoExecute,
    require_review: requireReview,
    deny,
  };

  const lines = [
    "# Gmail Live Ingestion Demo",
    "",
    `Generated at: ${payload.generated_at}`,
    `Mode: ${mode}`,
    "",
    "## Results",
    "",
    `- Total: ${payload.count}`,
    `- Auto-execute: ${payload.auto_execute} (${pct(payload.auto_execute, payload.count)})`,
    `- Require review: ${payload.require_review} (${pct(payload.require_review, payload.count)})`,
    `- Deny: ${payload.deny} (${pct(payload.deny, payload.count)})`,
    "",
    "## Artifacts",
    "",
    `- Audit trace: ${auditPath}`,
    `- JSON summary: ${reportJsonPath}`,
  ];

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(reportMdPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${reportMdPath}`);
  console.log(`Wrote ${reportJsonPath}`);
}

run().catch((error) => {
  console.error("Gmail live runner failed:", error);
  process.exitCode = 1;
});
