import type { InboundMessage } from "./schemas.js";
import { normalizeMessage } from "./normalization.js";
import { decideMessage } from "./agent.js";
import { evaluatePolicy } from "./policy.js";
import { executeToolAction, type ToolExecutionResult } from "./tools.js";
import { writeAuditEntry } from "./audit.js";

export type PipelineResult = {
  message_id: string;
  intent_label: string;
  priority_label: "low" | "medium" | "high";
  confidence: number;
  policy_decision: "AUTO_EXECUTE" | "REQUIRE_REVIEW" | "DENY";
  policy_reason: string;
  proposed_actions: Array<{
    tool_name: "create_task" | "draft_reply" | "update_record";
    args: Record<string, string | number | boolean>;
  }>;
  tool_results: ToolExecutionResult[];
};

export async function processMessage(
  message: InboundMessage,
  auditPath: string,
): Promise<PipelineResult> {
  const normalized = normalizeMessage(message);
  await writeAuditEntry(auditPath, {
    message_id: message.message_id,
    timestamp: new Date().toISOString(),
    stage: "normalized",
    payload: normalized,
  });

  const decision = await decideMessage(normalized);
  await writeAuditEntry(auditPath, {
    message_id: message.message_id,
    timestamp: new Date().toISOString(),
    stage: "decision",
    payload: decision,
  });

  const policyResult = evaluatePolicy(decision);
  await writeAuditEntry(auditPath, {
    message_id: message.message_id,
    timestamp: new Date().toISOString(),
    stage: "policy",
    payload: policyResult,
  });

  if (policyResult.decision !== "AUTO_EXECUTE") {
    return {
      message_id: message.message_id,
      intent_label: decision.intent_label,
      priority_label: decision.priority_label,
      confidence: decision.confidence,
      policy_decision: policyResult.decision,
      policy_reason: policyResult.reason,
      proposed_actions: decision.proposed_actions,
      tool_results: [],
    };
  }

  const toolResults: ToolExecutionResult[] = [];
  for (const action of decision.proposed_actions) {
    const result = await executeToolAction(action);
    toolResults.push(result);
    await writeAuditEntry(auditPath, {
      message_id: message.message_id,
      timestamp: new Date().toISOString(),
      stage: "tool_execution",
      payload: result,
    });
  }

  return {
    message_id: message.message_id,
    intent_label: decision.intent_label,
    priority_label: decision.priority_label,
    confidence: decision.confidence,
    policy_decision: policyResult.decision,
    policy_reason: policyResult.reason,
    proposed_actions: decision.proposed_actions,
    tool_results: toolResults,
  };
}
