import "dotenv/config";

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAuditEntry } from "./audit.js";
import { processMessage } from "./pipeline.js";
import {
  fetchGmailMessages,
  gmailMessageSchema,
  gmailMessageToInboundMessage,
  gmailMessageToReplyContext,
  sendGmailReply,
} from "./channels/gmail-live.js";

type RunnerMode = "mock" | "live";
type ReplyMode = "mock" | "live";

function pct(value: number, total: number): string {
  if (total === 0) {
    return "0.00%";
  }
  return `${((value / total) * 100).toFixed(2)}%`;
}

function parseCsvList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function renderReplyTemplate(template: string): string {
  switch (template) {
    case "incident_ack":
      return [
        "Hello,",
        "",
        "We have received your issue and created a support task for the engineering team.",
        "We will share an update after triage.",
        "",
        "Regards,",
        "Enterprise Inbox Workflow Agent",
      ].join("\n");
    case "general_info":
      return [
        "Hello,",
        "",
        "Thank you for your message. We have received your request and are reviewing it.",
        "If additional information is required, we will contact you.",
        "",
        "Regards,",
        "Enterprise Inbox Workflow Agent",
      ].join("\n");
    default:
      return [
        "Hello,",
        "",
        "Thank you for your message. We have received it and will follow up shortly.",
        "",
        "Regards,",
        "Enterprise Inbox Workflow Agent",
      ].join("\n");
  }
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
  const replyMode = (process.env.GMAIL_REPLY_MODE === "live" ? "live" : "mock") as ReplyMode;
  const maxResults = Number(process.env.GMAIL_MAX_RESULTS ?? 10);
  const query = process.env.GMAIL_QUERY ?? "newer_than:7d";
  const replyAllowlist = parseCsvList(process.env.GMAIL_REPLY_ALLOWLIST);

  if (replyMode === "live" && replyAllowlist.length === 0) {
    throw new Error("GMAIL_REPLY_MODE=live requires GMAIL_REPLY_ALLOWLIST with at least one email.");
  }

  const auditPath = resolve(process.cwd(), "logs/audit-gmail-live.jsonl");
  const reportMdPath = resolve(process.cwd(), "reports/gmail-live-demo.md");
  const reportJsonPath = resolve(process.cwd(), "reports/gmail-live-demo.json");

  let gmailMessages;
  let accessToken: string | undefined;

  if (mode === "live") {
    accessToken = process.env.GMAIL_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Missing GMAIL_ACCESS_TOKEN for live mode.");
    }
    gmailMessages = await fetchGmailMessages({ accessToken, maxResults, query });
  } else {
    const mockPath = resolve(process.cwd(), "data/gmail_messages_sample.jsonl");
    gmailMessages = await loadMockMessages(mockPath);
  }

  let autoExecute = 0;
  let requireReview = 0;
  let deny = 0;
  let repliesSent = 0;
  let repliesSkipped = 0;

  for (const gmailMessage of gmailMessages) {
    const inbound = gmailMessageToInboundMessage(gmailMessage);
    const result = await processMessage(inbound, auditPath);

    if (result.policy_decision === "AUTO_EXECUTE") {
      autoExecute += 1;
    } else if (result.policy_decision === "REQUIRE_REVIEW") {
      requireReview += 1;
    } else {
      deny += 1;
    }

    const replyAction = result.proposed_actions.find(
      (action) => action.tool_name === "reply" || action.tool_name === "draft_reply",
    );

    if (replyAction && result.policy_decision === "AUTO_EXECUTE") {
      const context = gmailMessageToReplyContext(gmailMessage);
      const template = String(replyAction.args.template ?? "default");
      const bodyText = renderReplyTemplate(template);

      const allowedRecipient =
        replyAllowlist.length === 0 || replyAllowlist.includes(context.recipientEmail.toLowerCase());

      if (replyMode === "live") {
        if (!accessToken) {
          throw new Error("Live reply mode requires GMAIL_ACCESS_TOKEN.");
        }

        if (!allowedRecipient) {
          repliesSkipped += 1;
          await writeAuditEntry(auditPath, {
            message_id: inbound.message_id,
            timestamp: new Date().toISOString(),
            stage: "gmail_reply",
            payload: {
              sent: false,
              reason: "recipient_not_allowlisted",
              recipient: context.recipientEmail,
            },
          });
          continue;
        }

        const sent = await sendGmailReply({
          accessToken,
          context,
          bodyText,
        });

        repliesSent += 1;
        await writeAuditEntry(auditPath, {
          message_id: inbound.message_id,
          timestamp: new Date().toISOString(),
          stage: "gmail_reply",
          payload: {
            sent: true,
            recipient: context.recipientEmail,
            template,
            gmail_message_id: sent.id,
            gmail_thread_id: sent.threadId,
          },
        });
      } else {
        repliesSkipped += 1;
        await writeAuditEntry(auditPath, {
          message_id: inbound.message_id,
          timestamp: new Date().toISOString(),
          stage: "gmail_reply",
          payload: {
            sent: false,
            reason: "reply_mode_mock",
            recipient: context.recipientEmail,
            template,
          },
        });
      }
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    mode,
    reply_mode: replyMode,
    query,
    count: gmailMessages.length,
    auto_execute: autoExecute,
    require_review: requireReview,
    deny,
    replies_sent: repliesSent,
    replies_skipped: repliesSkipped,
  };

  const lines = [
    "# Gmail Live Ingestion Demo",
    "",
    `Generated at: ${payload.generated_at}`,
    `Mode: ${mode}`,
    `Reply mode: ${replyMode}`,
    `Query: ${query}`,
    "",
    "## Results",
    "",
    `- Total: ${payload.count}`,
    `- Auto-execute: ${payload.auto_execute} (${pct(payload.auto_execute, payload.count)})`,
    `- Require review: ${payload.require_review} (${pct(payload.require_review, payload.count)})`,
    `- Deny: ${payload.deny} (${pct(payload.deny, payload.count)})`,
    `- Replies sent: ${payload.replies_sent}`,
    `- Replies skipped: ${payload.replies_skipped}`,
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
