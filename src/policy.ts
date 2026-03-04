import { policyResultSchema, type AgentDecision, type PolicyResult } from "./schemas.js";

const AUTO_EXECUTE_THRESHOLD = 0.8;
const REVIEW_THRESHOLD = 0.6;

const highRiskIntents = new Set(["access_request", "contract_status"]);

export function evaluatePolicy(decision: AgentDecision): PolicyResult {
  if (highRiskIntents.has(decision.intent_label) && decision.confidence < 0.9) {
    return policyResultSchema.parse({
      decision: "REQUIRE_REVIEW",
      reason: "High-risk intent requires elevated confidence or human approval.",
    });
  }

  if (decision.confidence >= AUTO_EXECUTE_THRESHOLD) {
    return policyResultSchema.parse({
      decision: "AUTO_EXECUTE",
      reason: "Confidence above auto-execute threshold.",
    });
  }

  if (decision.confidence >= REVIEW_THRESHOLD) {
    return policyResultSchema.parse({
      decision: "REQUIRE_REVIEW",
      reason: "Confidence in review band.",
    });
  }

  return policyResultSchema.parse({
    decision: "DENY",
    reason: "Low confidence, action denied by policy.",
  });
}
