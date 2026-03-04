import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

export type AuditEntry = {
  message_id: string;
  timestamp: string;
  stage: string;
  payload: unknown;
};

export async function writeAuditEntry(path: string, entry: AuditEntry): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}
