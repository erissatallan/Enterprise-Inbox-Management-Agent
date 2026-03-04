import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { processMessage } from "../src/pipeline.js";
import type { InboundMessage } from "../src/schemas.js";

test("pipeline auto-executes billing message and writes audit log", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "inbox-agent-"));
  const auditPath = join(tempDir, "audit.jsonl");

  const message: InboundMessage = {
    message_id: "itest_001",
    source: "email",
    subject: "Invoice duplicated",
    body: "We were charged twice for this invoice. Please update billing record.",
    sender: "finance@example.com",
    received_at: "2026-03-03T00:00:00Z",
    attachments_meta: [],
  };

  const result = await processMessage(message, auditPath);

  assert.equal(result.policy_decision, "AUTO_EXECUTE");
  assert.equal(result.tool_results.length, 1);
  assert.equal(result.tool_results[0]?.tool_name, "update_record");

  const auditRaw = await readFile(auditPath, "utf8");
  const lines = auditRaw.trim().split("\n");
  assert.equal(lines.length >= 4, true);
});
