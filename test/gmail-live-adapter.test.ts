import test from "node:test";
import assert from "node:assert/strict";

import { gmailMessageToInboundMessage } from "../src/channels/gmail-live.js";

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
