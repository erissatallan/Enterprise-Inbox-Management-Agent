import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { inboundMessageSchema, type InboundMessage } from "../schemas.js";

const FIVE_MINUTES = 60 * 5;

export const slackEventCallbackSchema = z.object({
  type: z.literal("event_callback"),
  event: z.object({
    type: z.string(),
    channel: z.string(),
    ts: z.string(),
    text: z.string().optional(),
    user: z.string().optional(),
    bot_id: z.string().optional(),
    subtype: z.string().optional(),
    thread_ts: z.string().optional(),
    channel_type: z.string().optional(),
  }),
});

export type SlackEventCallback = z.infer<typeof slackEventCallbackSchema>;

export function computeSlackSignature(signingSecret: string, timestamp: string, rawBody: string): string {
  const base = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret).update(base).digest("hex");
  return `v0=${digest}`;
}

export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  nowEpochSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const tolerance = params.toleranceSeconds ?? FIVE_MINUTES;
  const now = params.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const tsNum = Number(params.timestamp);

  if (!Number.isFinite(tsNum)) {
    return false;
  }

  if (Math.abs(now - tsNum) > tolerance) {
    return false;
  }

  const expected = computeSlackSignature(params.signingSecret, params.timestamp, params.rawBody);

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(params.signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function sanitizeTs(ts: string): string {
  return ts.replace(/[^a-zA-Z0-9]/g, "");
}

export function isProcessableSlackMessage(event: SlackEventCallback["event"]): boolean {
  if (event.type !== "message") {
    return false;
  }

  if (event.bot_id || event.subtype === "bot_message") {
    return false;
  }

  if (!event.text || event.text.trim().length === 0) {
    return false;
  }

  return true;
}

export function slackLiveEventToInboundMessage(event: SlackEventCallback["event"]): InboundMessage {
  const shortText = event.text ? event.text.slice(0, 72) : "No text";

  return inboundMessageSchema.parse({
    message_id: `slack_live_${event.channel}_${sanitizeTs(event.ts)}`,
    source: "chat",
    subject: `[Slack ${event.channel}] ${shortText}`,
    body: event.text ?? "",
    sender: event.user ?? "slack_unknown_user",
    received_at: new Date(Number(event.ts) * 1000).toISOString(),
    attachments_meta: [],
  });
}

export async function sendSlackMessage(params: {
  channel: string;
  text: string;
  threadTs?: string;
  mode: "mock" | "live";
  botToken?: string;
}): Promise<void> {
  if (params.mode === "mock") {
    console.log(`[SLACK MOCK] channel=${params.channel} threadTs=${params.threadTs ?? "none"} text=${params.text}`);
    return;
  }

  if (!params.botToken) {
    throw new Error("Missing SLACK_BOT_TOKEN for live outbound mode.");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: params.channel,
      text: params.text,
      thread_ts: params.threadTs,
    }),
  });

  const payload = (await response.json()) as { ok?: boolean; error?: string };

  if (!response.ok || !payload.ok) {
    throw new Error(`Slack post failed: status=${response.status} error=${payload.error ?? "unknown"}`);
  }
}
