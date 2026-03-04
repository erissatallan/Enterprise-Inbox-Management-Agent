import type { ToolAction } from "./schemas.js";

export type ToolExecutionResult = {
  tool_name: ToolAction["tool_name"];
  ok: boolean;
  detail: string;
};

export async function executeToolAction(action: ToolAction): Promise<ToolExecutionResult> {
  switch (action.tool_name) {
    case "create_task":
      return {
        tool_name: action.tool_name,
        ok: true,
        detail: `Task created in queue=${String(action.args.queue ?? "general")}`,
      };
    case "draft_reply":
      return {
        tool_name: action.tool_name,
        ok: true,
        detail: `Reply drafted with template=${String(action.args.template ?? "default")}`,
      };
    case "update_record":
      return {
        tool_name: action.tool_name,
        ok: true,
        detail: `Record updated with fields=${Object.keys(action.args).join(",")}`,
      };
    default:
      return {
        tool_name: action.tool_name,
        ok: false,
        detail: "Unsupported tool",
      };
  }
}
