import test from "node:test";
import assert from "node:assert/strict";

import { executeToolAction } from "../src/tools.js";

test("create_task routes through ticketing handoff adapter", async () => {
  const prior = {
    mode: process.env.BUSINESS_HANDOFF_MODE,
    ticketing: process.env.TICKETING_PROVIDER,
  };

  process.env.BUSINESS_HANDOFF_MODE = "mock";
  process.env.TICKETING_PROVIDER = "jira";

  const result = await executeToolAction(
    {
      tool_name: "create_task",
      args: { queue: "it-access", severity: "high" },
    },
    "msg_handoff_001",
  );

  assert.equal(result.ok, true);
  assert.equal(result.detail.includes("jira"), true);

  process.env.BUSINESS_HANDOFF_MODE = prior.mode;
  process.env.TICKETING_PROVIDER = prior.ticketing;
});

test("update_record routes through crm handoff adapter", async () => {
  const prior = {
    mode: process.env.BUSINESS_HANDOFF_MODE,
    crm: process.env.CRM_PROVIDER,
  };

  process.env.BUSINESS_HANDOFF_MODE = "mock";
  process.env.CRM_PROVIDER = "hubspot";

  const result = await executeToolAction(
    {
      tool_name: "update_record",
      args: { status: "open", queue: "billing" },
    },
    "msg_handoff_002",
  );

  assert.equal(result.ok, true);
  assert.equal(result.detail.includes("hubspot"), true);

  process.env.BUSINESS_HANDOFF_MODE = prior.mode;
  process.env.CRM_PROVIDER = prior.crm;
});
