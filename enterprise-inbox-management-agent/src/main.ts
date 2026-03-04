import { resolve } from "node:path";

import { loadJsonlMessages } from "./ingestion.js";
import { processMessage } from "./pipeline.js";

const DATA_PATH = resolve(process.cwd(), "data/messages_sample.jsonl");
const AUDIT_PATH = resolve(process.cwd(), "logs/audit.jsonl");

async function run(): Promise<void> {
  const messages = await loadJsonlMessages(DATA_PATH);
  const results = [];

  for (const message of messages) {
    const result = await processMessage(message, AUDIT_PATH);
    results.push(result);
  }

  console.log("Processed messages:", results.length);
  console.log(JSON.stringify(results, null, 2));
  console.log(`Audit log written to ${AUDIT_PATH}`);
}

run().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exitCode = 1;
});
