import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { processMessage } from "./pipeline.js";
import { emailThreadSchema, emailThreadToInboundMessage } from "./channels/email.js";
import { slackEventSchema, slackEventToInboundMessage } from "./channels/slack.js";
import type { InboundMessage } from "./schemas.js";

type ChannelResult = {
  channel: "slack" | "email";
  total: number;
  auto_execute: number;
  require_review: number;
  deny: number;
};

async function loadJsonl(path: string): Promise<unknown[]> {
  const raw = await readFile(path, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

function pct(value: number, total: number): string {
  if (total === 0) {
    return "0.00%";
  }
  return `${((value / total) * 100).toFixed(2)}%`;
}

async function runChannel(channel: "slack" | "email", messages: InboundMessage[], auditPath: string): Promise<ChannelResult> {
  let autoExecute = 0;
  let requireReview = 0;
  let deny = 0;

  for (const message of messages) {
    const result = await processMessage(message, auditPath);

    if (result.policy_decision === "AUTO_EXECUTE") {
      autoExecute += 1;
    } else if (result.policy_decision === "REQUIRE_REVIEW") {
      requireReview += 1;
    } else {
      deny += 1;
    }
  }

  return {
    channel,
    total: messages.length,
    auto_execute: autoExecute,
    require_review: requireReview,
    deny,
  };
}

async function run(): Promise<void> {
  const slackPath = resolve(process.cwd(), "data/slack_events_sample.jsonl");
  const emailPath = resolve(process.cwd(), "data/email_threads_sample.jsonl");
  const auditPath = resolve(process.cwd(), "logs/audit-channel-demo.jsonl");
  const reportPath = resolve(process.cwd(), "reports/channel-integration-demo.md");
  const reportJsonPath = resolve(process.cwd(), "reports/channel-integration-demo.json");

  const slackRaw = await loadJsonl(slackPath);
  const emailRaw = await loadJsonl(emailPath);

  const slackMessages = slackRaw.map((record) => slackEventToInboundMessage(slackEventSchema.parse(record)));
  const emailMessages = emailRaw.map((record) => emailThreadToInboundMessage(emailThreadSchema.parse(record)));

  const slackResult = await runChannel("slack", slackMessages, auditPath);
  const emailResult = await runChannel("email", emailMessages, auditPath);

  const payload = {
    generated_at: new Date().toISOString(),
    channels: [slackResult, emailResult],
  };

  const lines = [
    "# Channel Integration Demo",
    "",
    `Generated at: ${payload.generated_at}`,
    "",
    "## Channels covered",
    "",
    "- Slack message events (simulated workspace feed)",
    "- Email threads (simulated support/ops inbox)",
    "",
    "## Results",
    "",
    `- Slack: ${slackResult.auto_execute}/${slackResult.total} auto (${pct(slackResult.auto_execute, slackResult.total)}), ${slackResult.require_review}/${slackResult.total} review (${pct(slackResult.require_review, slackResult.total)}), ${slackResult.deny}/${slackResult.total} deny (${pct(slackResult.deny, slackResult.total)})`,
    `- Email: ${emailResult.auto_execute}/${emailResult.total} auto (${pct(emailResult.auto_execute, emailResult.total)}), ${emailResult.require_review}/${emailResult.total} review (${pct(emailResult.require_review, emailResult.total)}), ${emailResult.deny}/${emailResult.total} deny (${pct(emailResult.deny, emailResult.total)})`,
    "",
    "## Demonstrable business integration value",
    "",
    "- One policy engine handles both chat and inbox channels.",
    "- High-risk and uncertain requests still route to review.",
    "- Operational teams can onboard channels incrementally with adapter pattern.",
    "",
    "## Artifacts",
    "",
    `- Audit trace: ${auditPath}`,
    `- JSON summary: ${reportJsonPath}`,
  ];

  await mkdir(resolve(process.cwd(), "reports"), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${reportPath}`);
  console.log(`Wrote ${reportJsonPath}`);
}

run().catch((error) => {
  console.error("Channel demo failed:", error);
  process.exitCode = 1;
});
