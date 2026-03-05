import "dotenv/config";

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type Mode = "mock" | "live";
type TicketingProvider = "jira" | "linear";
type CrmProvider = "hubspot" | "salesforce";

const MOCK_CRM_UPDATES_PATH = resolve(process.cwd(), "logs/mock-crm-updates.jsonl");

function mode(): Mode {
  return process.env.BUSINESS_HANDOFF_MODE === "live" ? "live" : "mock";
}

function ticketingProvider(): TicketingProvider {
  const provider = process.env.TICKETING_PROVIDER;
  return provider === "linear" ? "linear" : "jira";
}

function crmProvider(): CrmProvider {
  const provider = process.env.CRM_PROVIDER;
  return provider === "salesforce" ? "salesforce" : "hubspot";
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

function resolveRecordId(payload: {
  messageId: string;
  fields: Record<string, string | number | boolean>;
}): string {
  return (
    toOptionalString(payload.fields.record_id) ||
    toOptionalString(payload.fields.customer_id) ||
    payload.messageId
  );
}

async function appendMockCrmUpdate(entry: {
  provider: CrmProvider;
  message_id: string;
  record_id: string;
  status: string;
  fields: Record<string, string | number | boolean>;
}): Promise<void> {
  await mkdir(dirname(MOCK_CRM_UPDATES_PATH), { recursive: true });
  await appendFile(
    MOCK_CRM_UPDATES_PATH,
    `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`,
    "utf8",
  );
}

async function postJson(url: string, payload: unknown): Promise<{ status: number; body: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    body: await response.text(),
  };
}

export async function createTicket(payload: {
  messageId: string;
  queue: string;
  severity: string;
  summary: string;
}): Promise<{ provider: TicketingProvider; reference: string }> {
  const provider = ticketingProvider();

  if (mode() === "mock") {
    const reference = `${provider.toUpperCase()}-${payload.messageId}`;
    console.log(`[TICKETING MOCK] provider=${provider} queue=${payload.queue} severity=${payload.severity} ref=${reference}`);
    return { provider, reference };
  }

  const url = process.env.TICKETING_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing TICKETING_WEBHOOK_URL for live ticketing handoff.");
  }

  const result = await postJson(url, {
    provider,
    type: "create_ticket",
    payload,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Ticketing handoff failed with status ${result.status}`);
  }

  return { provider, reference: `${provider.toUpperCase()}-LIVE-${payload.messageId}` };
}

export async function updateCrm(payload: {
  messageId: string;
  status: string;
  fields: Record<string, string | number | boolean>;
}): Promise<{ provider: CrmProvider; reference: string; recordId: string }> {
  const provider = crmProvider();
  const recordId = resolveRecordId(payload);

  if (mode() === "mock") {
    const reference = `${provider.toUpperCase()}-${payload.messageId}`;
    console.log(`[CRM MOCK] provider=${provider} record_id=${recordId} status=${payload.status} ref=${reference}`);

    await appendMockCrmUpdate({
      provider,
      message_id: payload.messageId,
      record_id: recordId,
      status: payload.status,
      fields: payload.fields,
    });

    return { provider, reference, recordId };
  }

  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing CRM_WEBHOOK_URL for live CRM handoff.");
  }

  const result = await postJson(url, {
    provider,
    type: "update_record",
    payload: {
      ...payload,
      record_id: recordId,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`CRM handoff failed with status ${result.status}`);
  }

  return { provider, reference: `${provider.toUpperCase()}-LIVE-${payload.messageId}`, recordId };
}
