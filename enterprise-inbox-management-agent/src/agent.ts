import "dotenv/config";

import { agentDecisionSchema, type AgentDecision, type NormalizedMessage } from "./schemas.js";

type HeuristicDecision = Omit<AgentDecision, "confidence" | "rationale_summary">;

function ruleBasedDecision(message: NormalizedMessage): AgentDecision {
  const text = message.clean_text.toLowerCase();

  let base: HeuristicDecision;
  let confidence = 0.72;
  let rationale = "Heuristic match on subject/body intent cues.";

  if (text.includes("invoice") || text.includes("payment") || text.includes("charged")) {
    base = {
      intent_label: "billing_question",
      priority_label: "medium",
      entities: {},
      proposed_actions: [{ tool_name: "update_record", args: { queue: "billing", status: "open" } }],
    };
    confidence = 0.83;
  } else if (text.includes("login") || text.includes("access") || text.includes("permission")) {
    base = {
      intent_label: "access_request",
      priority_label: "high",
      entities: {},
      proposed_actions: [{ tool_name: "create_task", args: { queue: "it-access", severity: "high" } }],
    };
    confidence = 0.78;
  } else if (text.includes("error") || text.includes("bug") || text.includes("not working")) {
    base = {
      intent_label: "technical_issue",
      priority_label: "high",
      entities: {},
      proposed_actions: [
        { tool_name: "create_task", args: { queue: "engineering-support", severity: "high" } },
        { tool_name: "draft_reply", args: { template: "incident_ack" } },
      ],
    };
    confidence = 0.86;
  } else if (text.includes("contract") || text.includes("renewal") || text.includes("status")) {
    base = {
      intent_label: "contract_status",
      priority_label: "medium",
      entities: {},
      proposed_actions: [{ tool_name: "create_task", args: { queue: "revops", severity: "medium" } }],
    };
  } else if (text.includes("onboarding") || text.includes("kickoff")) {
    base = {
      intent_label: "onboarding_request",
      priority_label: "medium",
      entities: {},
      proposed_actions: [{ tool_name: "create_task", args: { queue: "onboarding", severity: "medium" } }],
    };
    confidence = 0.82;
  } else {
    base = {
      intent_label: "general_info",
      priority_label: "low",
      entities: {},
      proposed_actions: [{ tool_name: "draft_reply", args: { template: "general_info" } }],
    };
    confidence = 0.62;
    rationale = "Fallback decision due to weak intent cues.";
  }

  return agentDecisionSchema.parse({
    ...base,
    confidence,
    rationale_summary: rationale,
  });
}

export async function decideMessage(message: NormalizedMessage): Promise<AgentDecision> {
  const provider = process.env.DECISION_PROVIDER ?? "heuristic";

  if (provider !== "heuristic") {
    console.warn(`Unknown DECISION_PROVIDER=${provider}, falling back to heuristic mode.`);
  }

  return ruleBasedDecision(message);
}
