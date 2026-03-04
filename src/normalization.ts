import { type InboundMessage, normalizedMessageSchema, type NormalizedMessage } from "./schemas.js";

const htmlTagRegex = /<[^>]+>/g;
const multiWhitespaceRegex = /\s+/g;

function inferSenderRole(sender: string): "customer" | "partner" | "internal" | "unknown" {
  const lowered = sender.toLowerCase();
  if (lowered.includes("@yourcompany.com")) {
    return "internal";
  }
  if (lowered.includes("@partner")) {
    return "partner";
  }
  if (lowered.includes("@")) {
    return "customer";
  }
  return "unknown";
}

export function normalizeMessage(message: InboundMessage): NormalizedMessage {
  const cleanBody = message.body
    .replace(htmlTagRegex, " ")
    .replace(multiWhitespaceRegex, " ")
    .trim();

  return normalizedMessageSchema.parse({
    message_id: message.message_id,
    clean_text: `${message.subject}\n${cleanBody}`.trim(),
    channel: message.source,
    sender_role: inferSenderRole(message.sender),
    language: "en",
  });
}
