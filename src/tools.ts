import { createTicket, updateCrm } from "./integrations-business-handoff.js";
import type { ToolAction } from "./schemas.js";

export type ToolExecutionResult = {
  tool_name: ToolAction["tool_name"];
  ok: boolean;
  detail: string;
};

function coerceString(value: string | number | boolean | undefined, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }
  return String(value);
}

export async function executeToolAction(action: ToolAction, messageId = "unknown_message"): Promise<ToolExecutionResult> {
  switch (action.tool_name) {
    case "create_task": {
      const queue = coerceString(action.args.queue, "general");
      const severity = coerceString(action.args.severity, "medium");
      const handoff = await createTicket({
        messageId,
        queue,
        severity,
        summary: `Task for ${messageId}`,
      });

      return {
        tool_name: action.tool_name,
        ok: true,
        detail: `Ticket created via ${handoff.provider} ref=${handoff.reference} queue=${queue}`,
      };
    }
    case "draft_reply":
      return {
        tool_name: action.tool_name,
        ok: true,
        detail: `Reply drafted with template=${coerceString(action.args.template, "default")}`,
      };
    case "update_record": {
      const status = coerceString(action.args.status, "open");
      const handoff = await updateCrm({
        messageId,
        status,
        fields: action.args,
      });

      return {
        tool_name: action.tool_name,
        ok: true,
        detail: `CRM updated via ${handoff.provider} ref=${handoff.reference} status=${status}`,
      };
    }
    default:
      return {
        tool_name: action.tool_name,
        ok: false,
        detail: "Unsupported tool",
      };
  }
}
