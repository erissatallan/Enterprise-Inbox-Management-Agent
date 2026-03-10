import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGmailReplyRaw,
  decodeBase64Url,
  gmailMessageToInboundMessage,
  gmailMessageToReplyContext,
} from "../src/channels/gmail-live.js";

test("gmailMessageToInboundMessage maps headers and body into canonical message", () => {
  const msg = gmailMessageToInboundMessage({
    id: "m1",
    threadId: "t1",
    internalDate: "1709596800000",
    payload: {
      headers: [
        { name: "From", value: "finance@northwind.com" },
        { name: "Subject", value: "Invoice correction needed" },
      ],
      body: {
        data: "V2Ugd2VyZSBjaGFyZ2VkIHR3aWNlLg==",
      },
    },
  });

  assert.equal(msg.message_id, "gmail_m1");
  assert.equal(msg.source, "email");
  assert.equal(msg.sender, "finance@northwind.com");
  assert.equal(msg.subject, "Invoice correction needed");
  assert.equal(msg.body.includes("charged twice"), true);
});

test("gmailMessageToReplyContext extracts recipient and thread headers", () => {
  const ctx = gmailMessageToReplyContext({
    id: "m2",
    threadId: "t2",
    internalDate: "1709596800000",
    payload: {
      headers: [
        { name: "From", value: "Jane Doe <jane@example.com>" },
        { name: "Subject", value: "Need support" },
        { name: "Message-ID", value: "<abc123@example.com>" },
      ],
      body: {},
    },
  });

  assert.equal(ctx.recipientEmail, "jane@example.com");
  assert.equal(ctx.threadId, "t2");
  assert.equal(ctx.originalMessageIdHeader, "<abc123@example.com>");
});

test("buildGmailReplyRaw encodes RFC822 payload with expected headers", () => {
  const raw = buildGmailReplyRaw({
    context: {
      messageId: "m3",
      threadId: "t3",
      recipientEmail: "alice@example.com",
      originalSubject: "Status update",
      originalMessageIdHeader: "<msg123@example.com>",
    },
    bodyText: "Hello from agent.",
  });

  const decoded = decodeBase64Url(raw);
  assert.equal(decoded.includes("To: alice@example.com"), true);
  assert.equal(decoded.includes("Subject: Re: Status update"), true);
  assert.equal(decoded.includes("In-Reply-To: <msg123@example.com>"), true);
  assert.equal(decoded.includes("Hello from agent."), true);
});
