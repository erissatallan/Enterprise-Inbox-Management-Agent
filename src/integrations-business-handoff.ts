import "dotenv/config";

type Mode = "mock" | "live";
type TicketingProvider = "jira" | "linear";
type CrmProvider = "hubspot" | "salesforce";

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
}): Promise<{ provider: CrmProvider; reference: string }> {
  const provider = crmProvider();

  if (mode() === "mock") {
    const reference = `${provider.toUpperCase()}-${payload.messageId}`;
    console.log(`[CRM MOCK] provider=${provider} status=${payload.status} ref=${reference}`);
    return { provider, reference };
  }

  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing CRM_WEBHOOK_URL for live CRM handoff.");
  }

  const result = await postJson(url, {
    provider,
    type: "update_record",
    payload,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`CRM handoff failed with status ${result.status}`);
  }

  return { provider, reference: `${provider.toUpperCase()}-LIVE-${payload.messageId}` };
}
