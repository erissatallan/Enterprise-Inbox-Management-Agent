import test from "node:test";
import assert from "node:assert/strict";

import { computeSlackSignature, verifySlackSignature } from "../src/channels/slack-live.js";

test("verifySlackSignature accepts valid signature", () => {
  const signingSecret = "top_secret";
  const timestamp = "1719930100";
  const rawBody = JSON.stringify({ type: "event_callback", event: { type: "message" } });
  const signature = computeSlackSignature(signingSecret, timestamp, rawBody);

  const valid = verifySlackSignature({
    signingSecret,
    timestamp,
    signature,
    rawBody,
    nowEpochSeconds: 1719930102,
  });

  assert.equal(valid, true);
});

test("verifySlackSignature rejects stale timestamp", () => {
  const signingSecret = "top_secret";
  const timestamp = "1719930100";
  const rawBody = JSON.stringify({ type: "event_callback", event: { type: "message" } });
  const signature = computeSlackSignature(signingSecret, timestamp, rawBody);

  const valid = verifySlackSignature({
    signingSecret,
    timestamp,
    signature,
    rawBody,
    nowEpochSeconds: 1719931000,
  });

  assert.equal(valid, false);
});

test("verifySlackSignature rejects tampered body", () => {
  const signingSecret = "top_secret";
  const timestamp = "1719930100";
  const rawBody = JSON.stringify({ type: "event_callback", event: { type: "message" } });
  const signature = computeSlackSignature(signingSecret, timestamp, rawBody);

  const valid = verifySlackSignature({
    signingSecret,
    timestamp,
    signature,
    rawBody: JSON.stringify({ type: "event_callback", event: { type: "message", text: "tampered" } }),
    nowEpochSeconds: 1719930102,
  });

  assert.equal(valid, false);
});
