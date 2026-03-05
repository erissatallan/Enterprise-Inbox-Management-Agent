import { z } from "zod";

import { inboundMessageSchema, type InboundMessage } from "../schemas.js";

export const emailThreadSchema = z.object({
  thread_id: z.string().min(1),
  from_email: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  received_at: z.string().min(1),
  attachments: z.array(z.object({ filename: z.string(), mime: z.string() })).default([]),
});

export type EmailThread = z.infer<typeof emailThreadSchema>;

export function emailThreadToInboundMessage(thread: EmailThread): InboundMessage {
  return inboundMessageSchema.parse({
    message_id: `email_${thread.thread_id}`,
    source: "email",
    subject: thread.subject,
    body: thread.body,
    sender: thread.from_email,
    received_at: thread.received_at,
    attachments_meta: thread.attachments.map((attachment) => ({
      source: "email",
      name: attachment.filename,
      type: attachment.mime,
    })),
  });
}
