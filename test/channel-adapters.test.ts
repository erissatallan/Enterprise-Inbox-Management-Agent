import test from "node:test";
import assert from "node:assert/strict";

import { emailThreadToInboundMessage } from "../src/channels/email.js";
import { slackEventToInboundMessage } from "../src/channels/slack.js";

test("slack adapter maps event into canonical inbound message", () => {
  const result = slackEventToInboundMessage({
    channel_id: "C100",
    channel_name: "support",
    ts: "1719930100",
    user_email: "agent@client.com",
    text: "Need access permissions for reporting dashboard",
    thread_summary: "Access issue",
    attachments: [],
  });

  assert.equal(result.source, "chat");
  assert.equal(result.sender, "agent@client.com");
  assert.equal(result.message_id.startsWith("slack_C100_"), true);
});

test("email adapter maps thread into canonical inbound message", () => {
  const result = emailThreadToInboundMessage({
    thread_id: "abc123",
    from_email: "finance@company.com",
    subject: "Invoice support",
    body: "Need help with invoice correction.",
    received_at: "2026-03-04T08:00:00Z",
    attachments: [],
  });

  assert.equal(result.source, "email");
  assert.equal(result.message_id, "email_abc123");
  assert.equal(result.sender, "finance@company.com");
});
