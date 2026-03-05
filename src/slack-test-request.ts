import "dotenv/config";

import { computeSlackSignature } from "./channels/slack-live.js";

async function run(): Promise<void> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    throw new Error("Missing SLACK_SIGNING_SECRET in environment.");
  }

  const port = Number(process.env.PORT ?? 8787);
  const nowTs = Math.floor(Date.now() / 1000).toString();

  const payload = {
    type: "event_callback",
    event: {
      type: "message",
      channel: "C_TEST_CHANNEL",
      ts: `${nowTs}.000100`,
      text: "Need access to billing dashboard for finance close",
      user: "U_TEST_USER",
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = computeSlackSignature(signingSecret, nowTs, rawBody);

  const response = await fetch(`http://localhost:${port}/slack/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Slack-Request-Timestamp": nowTs,
      "X-Slack-Signature": signature,
    },
    body: rawBody,
  });

  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Body: ${text}`);
}

run().catch((error) => {
  console.error("Slack test request failed:", error);
  process.exitCode = 1;
});
