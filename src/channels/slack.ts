import { z } from "zod";

import { inboundMessageSchema, type InboundMessage } from "../schemas.js";

export const slackEventSchema = z.object({
  channel_id: z.string().min(1),
  channel_name: z.string().min(1),
  ts: z.string().min(1),
  user_email: z.string().email(),
  text: z.string().min(1),
  thread_summary: z.string().optional(),
  attachments: z.array(z.object({ name: z.string(), type: z.string() })).default([]),
});

export type SlackEvent = z.infer<typeof slackEventSchema>;

function sanitizeTs(ts: string): string {
  return ts.replace(/[^a-zA-Z0-9]/g, "");
}

export function slackEventToInboundMessage(event: SlackEvent): InboundMessage {
  const subject = event.thread_summary
    ? `[Slack #${event.channel_name}] ${event.thread_summary}`
    : `[Slack #${event.channel_name}] ${event.text.slice(0, 72)}`;

  return inboundMessageSchema.parse({
    message_id: `slack_${event.channel_id}_${sanitizeTs(event.ts)}`,
    source: "chat",
    subject,
    body: event.text,
    sender: event.user_email,
    received_at: new Date(Number(event.ts) * 1000).toISOString(),
    attachments_meta: event.attachments.map((attachment) => ({
      source: "slack",
      name: attachment.name,
      type: attachment.type,
    })),
  });
}
