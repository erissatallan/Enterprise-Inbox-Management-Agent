import "dotenv/config";

import { createServer } from "node:http";
import { resolve } from "node:path";

import { processMessage } from "./pipeline.js";
import {
  isProcessableSlackMessage,
  sendSlackMessage,
  slackEventCallbackSchema,
  slackLiveEventToInboundMessage,
  verifySlackSignature,
} from "./channels/slack-live.js";

const PORT = Number(process.env.PORT ?? 8787);
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const OUTBOUND_MODE = process.env.SLACK_OUTBOUND_MODE === "live" ? "live" : "mock";

const AUDIT_PATH = resolve(process.cwd(), "logs/audit-slack-live.jsonl");

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

function buildOutcomeMessage(result: Awaited<ReturnType<typeof processMessage>>): string {
  if (result.policy_decision === "AUTO_EXECUTE") {
    const action = result.proposed_actions[0];
    return `Handled automatically. Intent=${result.intent_label}, action=${action?.tool_name ?? "none"}.`;
  }

  if (result.policy_decision === "REQUIRE_REVIEW") {
    return `Routed to human review. Intent=${result.intent_label}. Reason=${result.policy_reason}`;
  }

  return `Action denied by policy. Intent=${result.intent_label}. Reason=${result.policy_reason}`;
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

    await sendSlackMessage({
      channel: event.channel,
      threadTs: event.thread_ts ?? event.ts,
      text: buildOutcomeMessage(result),
      mode: OUTBOUND_MODE,
      botToken: BOT_TOKEN,
    });

    json(res, 200, { ok: true, decision: result.policy_decision });
  } catch (error) {
    json(res, 500, { ok: false, error: (error as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`Slack live server listening on http://localhost:${PORT}/slack/events`);
  console.log(`Outbound mode: ${OUTBOUND_MODE}`);
});
