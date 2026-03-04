import { readFile } from "node:fs/promises";

import { inboundMessageSchema, type InboundMessage } from "./schemas.js";

export async function loadJsonlMessages(filePath: string): Promise<InboundMessage[]> {
  const raw = await readFile(filePath, "utf8");
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);

  return lines.map((line, index) => {
    const parsed = JSON.parse(line) as unknown;
    try {
      return inboundMessageSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Invalid record at line ${index + 1}: ${(error as Error).message}`);
    }
  });
}
