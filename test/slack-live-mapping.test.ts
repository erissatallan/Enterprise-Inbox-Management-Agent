import test from "node:test";
import assert from "node:assert/strict";

import { isProcessableSlackMessage, slackLiveEventToInboundMessage } from "../src/channels/slack-live.js";

test("isProcessableSlackMessage accepts user message with text", () => {
  const valid = isProcessableSlackMessage({
    type: "message",
    channel: "C100",
    ts: "1719930100",
    text: "Need onboarding help",
  });

  assert.equal(valid, true);
});

test("isProcessableSlackMessage rejects bot message", () => {
  const valid = isProcessableSlackMessage({
    type: "message",
    channel: "C100",
    ts: "1719930100",
    text: "automated note",
    bot_id: "B01",
  });

  assert.equal(valid, false);
});

test("slackLiveEventToInboundMessage maps event into canonical message", () => {
  const message = slackLiveEventToInboundMessage({
    type: "message",
    channel: "C100",
    ts: "1719930100",
    text: "Please grant access",
    user: "U123",
  });

  assert.equal(message.source, "chat");
  assert.equal(message.sender, "U123");
  assert.equal(message.message_id.startsWith("slack_live_C100_"), true);
});
