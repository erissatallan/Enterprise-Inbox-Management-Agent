import "dotenv/config";

import { createServer } from "node:http";
import { resolve } from "node:path";

import { processMessage, type PipelineResult } from "./pipeline.js";
import {
  isProcessableSlackMessage,
  sendSlackDirectMessage,
  sendSlackMessage,
  slackEventCallbackSchema,
  slackLiveEventToInboundMessage,
  verifySlackSignature,
} from "./channels/slack-live.js";

const PORT = Number(process.env.PORT ?? 8787);
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? process.env.SLACK_BOT_USER_OAUTH_TOKEN;
const OUTBOUND_MODE = process.env.SLACK_OUTBOUND_MODE === "live" ? "live" : "mock";
const DEFAULT_REVIEW_OWNER_RAW = process.env.SLACK_REVIEW_OWNER_USER_ID ?? "";
const QUEUE_REVIEW_OWNERS_JSON = process.env.SLACK_REVIEW_QUEUE_OWNERS_JSON ?? "{}";

const AUDIT_PATH = resolve(process.cwd(), "logs/audit-slack-live.jsonl");

type QueueOwnerMap = Record<string, string[]>;

function parseUserIdList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function uniqueUserIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function parseQueueOwnerMap(raw: string): QueueOwnerMap {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const map: QueueOwnerMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== "string") {
        continue;
      }

      if (typeof value === "string") {
        const ids = parseUserIdList(value);
        if (ids.length > 0) {
          map[key.toLowerCase()] = uniqueUserIds(ids);
        }
        continue;
      }

      if (Array.isArray(value)) {
        const ids = uniqueUserIds(
          value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        );

        if (ids.length > 0) {
          map[key.toLowerCase()] = ids;
        }
      }
    }

    return map;
  } catch {
    return {};
  }
}

const DEFAULT_REVIEW_OWNERS = uniqueUserIds(parseUserIdList(DEFAULT_REVIEW_OWNER_RAW));
const QUEUE_REVIEW_OWNERS = parseQueueOwnerMap(QUEUE_REVIEW_OWNERS_JSON);

function json(res: import("node:http").ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function extractQueue(result: PipelineResult): string {
  const queue = result.proposed_actions[0]?.args.queue;
  if (typeof queue !== "string") {
    return "";
  }
  return queue.trim().toLowerCase();
}

function resolveReviewOwners(result: PipelineResult): string[] {
  const queue = extractQueue(result);
  if (queue && QUEUE_REVIEW_OWNERS[queue]?.length) {
    return QUEUE_REVIEW_OWNERS[queue];
  }
  return DEFAULT_REVIEW_OWNERS;
}

function buildOutcomeMessage(result: PipelineResult): string {
  if (result.policy_decision === "AUTO_EXECUTE") {
    const action = result.proposed_actions[0];
    const toolDetail = result.tool_results[0]?.detail;

    if (toolDetail) {
      return `Handled automatically. Intent=${result.intent_label}, action=${action?.tool_name ?? "none"}. Evidence=${toolDetail}`;
    }

    return `Handled automatically. Intent=${result.intent_label}, action=${action?.tool_name ?? "none"}.`;
  }

  if (result.policy_decision === "REQUIRE_REVIEW") {
    return `Routed to human review. Intent=${result.intent_label}. Reason=${result.policy_reason}`;
  }

  return `Action denied by policy. Intent=${result.intent_label}. Reason=${result.policy_reason}`;
}

function buildReviewOwnerNotification(result: PipelineResult, ownerUserIds: string[]): string {
  const queue = extractQueue(result) || "general";
  const mentions = ownerUserIds.map((id) => `<@${id}>`).join(" ");
  return [
    `Escalation: notified ${mentions} for human review.`,
    `Queue=${queue}`,
    `Intent=${result.intent_label}`,
    `Reason=${result.policy_reason}`,
    `MessageID=${result.message_id}`,
  ].join(" ");
}

function buildReviewDmText(params: {
  result: PipelineResult;
  sourceChannel: string;
  threadTs: string;
  requester?: string;
}): string {
  const queue = extractQueue(params.result) || "general";
  const requester = params.requester ? `<@${params.requester}>` : "unknown requester";

  return [
    "Enterprise Inbox Workflow Agent escalation.",
    `Queue=${queue}`,
    `Intent=${params.result.intent_label}`,
    `Reason=${params.result.policy_reason}`,
    `Requester=${requester}`,
    `SourceChannel=${params.sourceChannel}`,
    `ThreadTs=${params.threadTs}`,
    `MessageID=${params.result.message_id}`,
    "Please review and take action.",
  ].join(" ");
}

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/slack/events") {
    json(res, 404, { ok: false, error: "not_found" });
    return;
  }

  if (!SIGNING_SECRET) {
    json(res, 500, { ok: false, error: "missing_slack_signing_secret" });
    return;
  }

  const timestampHeader = req.headers["x-slack-request-timestamp"];
  const signatureHeader = req.headers["x-slack-signature"];

  if (typeof timestampHeader !== "string" || typeof signatureHeader !== "string") {
    json(res, 401, { ok: false, error: "missing_signature_headers" });
    return;
  }

  const rawBody = await readBody(req);

  const validSignature = verifySlackSignature({
    signingSecret: SIGNING_SECRET,
    timestamp: timestampHeader,
    signature: signatureHeader,
    rawBody,
  });

  if (!validSignature) {
    json(res, 401, { ok: false, error: "invalid_signature" });
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    json(res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    (payload as { type?: unknown }).type === "url_verification" &&
    "challenge" in payload
  ) {
    json(res, 200, { challenge: (payload as { challenge?: unknown }).challenge });
    return;
  }

  const parsed = slackEventCallbackSchema.safeParse(payload);
  if (!parsed.success) {
    json(res, 200, { ok: true, ignored: true, reason: "unsupported_event_shape" });
    return;
  }

  const event = parsed.data.event;
  if (!isProcessableSlackMessage(event)) {
    json(res, 200, { ok: true, ignored: true, reason: "non_processable_message" });
    return;
  }

  try {
    const inbound = slackLiveEventToInboundMessage(event);
    const result = await processMessage(inbound, AUDIT_PATH);
    const threadTs = event.thread_ts ?? event.ts;

    await sendSlackMessage({
      channel: event.channel,
      threadTs,
      text: buildOutcomeMessage(result),
      mode: OUTBOUND_MODE,
      botToken: BOT_TOKEN,
    });

    if (result.policy_decision === "REQUIRE_REVIEW") {
      const reviewOwnerUserIds = resolveReviewOwners(result);
      if (reviewOwnerUserIds.length > 0) {
        await sendSlackMessage({
          channel: event.channel,
          threadTs,
          text: buildReviewOwnerNotification(result, reviewOwnerUserIds),
          mode: OUTBOUND_MODE,
          botToken: BOT_TOKEN,
        });

        for (const ownerUserId of reviewOwnerUserIds) {
          await sendSlackDirectMessage({
            userId: ownerUserId,
            text: buildReviewDmText({
              result,
              sourceChannel: event.channel,
              threadTs,
              requester: event.user,
            }),
            mode: OUTBOUND_MODE,
            botToken: BOT_TOKEN,
          });
        }
      }
    }

    json(res, 200, { ok: true, decision: result.policy_decision });
  } catch (error) {
    json(res, 500, { ok: false, error: (error as Error).message });
  }
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error("Stop the old process or start on a different port.");
    console.error(`Find process: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
    console.error("Then stop it: kill <PID>");
    console.error(`Or run: PORT=${PORT + 1} npm run slack:live`);
    process.exit(1);
  }

  console.error("Slack live server failed to start:", error.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Slack live server listening on http://localhost:${PORT}/slack/events`);
  console.log(`Outbound mode: ${OUTBOUND_MODE}`);
  if (DEFAULT_REVIEW_OWNERS.length > 0) {
    console.log(`Default review owners configured: ${DEFAULT_REVIEW_OWNERS.length}`);
  }
});
