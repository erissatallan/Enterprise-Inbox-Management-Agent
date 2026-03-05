import { z } from "zod";

import { inboundMessageSchema, type InboundMessage } from "../schemas.js";

const gmailHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const gmailPayloadSchema = z.object({
  headers: z.array(gmailHeaderSchema).default([]),
  body: z
    .object({
      data: z.string().optional(),
    })
    .optional(),
  parts: z
    .array(
      z.object({
        mimeType: z.string().optional(),
        body: z
          .object({
            data: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export const gmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  internalDate: z.string(),
  payload: gmailPayloadSchema,
});

export type GmailMessage = z.infer<typeof gmailMessageSchema>;

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return Buffer.from(padded, "base64").toString("utf8");
}

function headerValue(headers: Array<{ name: string; value: string }>, headerName: string): string | undefined {
  const found = headers.find((header) => header.name.toLowerCase() === headerName.toLowerCase());
  return found?.value;
}

function extractTextBody(message: GmailMessage): string {
  const inlineData = message.payload.body?.data;
  if (inlineData) {
    return decodeBase64Url(inlineData);
  }

  const textPart = message.payload.parts?.find((part) => part.mimeType === "text/plain" && part.body?.data);
  if (textPart?.body?.data) {
    return decodeBase64Url(textPart.body.data);
  }

  const firstPartWithData = message.payload.parts?.find((part) => Boolean(part.body?.data));
  if (firstPartWithData?.body?.data) {
    return decodeBase64Url(firstPartWithData.body.data);
  }

  return "";
}

export function gmailMessageToInboundMessage(message: GmailMessage): InboundMessage {
  const headers = message.payload.headers;
  const from = headerValue(headers, "From") ?? "unknown@gmail.com";
  const subject = headerValue(headers, "Subject") ?? "No subject";
  const body = extractTextBody(message).trim();

  return inboundMessageSchema.parse({
    message_id: `gmail_${message.id}`,
    source: "email",
    subject,
    body,
    sender: from,
    received_at: new Date(Number(message.internalDate)).toISOString(),
    attachments_meta: [],
  });
}

export async function fetchGmailMessages(params: {
  accessToken: string;
  maxResults?: number;
  query?: string;
}): Promise<GmailMessage[]> {
  const maxResults = params.maxResults ?? 10;
  const queryPart = params.query ? `&q=${encodeURIComponent(params.query)}` : "";

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${queryPart}`;
  const listResp = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });

  if (!listResp.ok) {
    throw new Error(`Gmail list request failed with status ${listResp.status}`);
  }

  const listPayload = (await listResp.json()) as { messages?: Array<{ id: string }> };
  const ids = listPayload.messages?.map((message) => message.id) ?? [];

  const detailed: GmailMessage[] = [];
  for (const id of ids) {
    const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
    const detailResp = await fetch(detailUrl, {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    });

    if (!detailResp.ok) {
      throw new Error(`Gmail detail request failed for ${id} with status ${detailResp.status}`);
    }

    const detailPayload = (await detailResp.json()) as unknown;
    detailed.push(gmailMessageSchema.parse(detailPayload));
  }

  return detailed;
}
