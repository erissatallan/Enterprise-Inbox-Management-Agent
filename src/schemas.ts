import { z } from "zod";

export const inboundMessageSchema = z.object({
  message_id: z.string().min(1),
  source: z.enum(["email", "chat", "form"]),
  subject: z.string(),
  body: z.string(),
  sender: z.string().email().or(z.string().min(1)),
  received_at: z.string(),
  attachments_meta: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const normalizedMessageSchema = z.object({
  message_id: z.string(),
  clean_text: z.string(),
  channel: z.enum(["email", "chat", "form"]),
  sender_role: z.enum(["customer", "partner", "internal", "unknown"]),
  language: z.string(),
  thread_context: z.string().optional(),
});

export const toolNameSchema = z.enum(["create_task", "draft_reply", "reply", "update_record"]);

export const toolActionSchema = z.object({
  tool_name: toolNameSchema,
  args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const agentDecisionSchema = z.object({
  intent_label: z.enum([
    "access_request",
    "billing_question",
    "contract_status",
    "technical_issue",
    "onboarding_request",
    "escalation",
    "meeting_scheduling",
    "general_info",
  ]),
  priority_label: z.enum(["low", "medium", "high"]),
  entities: z.record(z.string(), z.string()),
  proposed_actions: z.array(toolActionSchema).min(1),
  confidence: z.number().min(0).max(1),
  rationale_summary: z.string(),
});

export const policyResultSchema = z.object({
  decision: z.enum(["AUTO_EXECUTE", "REQUIRE_REVIEW", "DENY"]),
  reason: z.string(),
});

export type InboundMessage = z.infer<typeof inboundMessageSchema>;
export type NormalizedMessage = z.infer<typeof normalizedMessageSchema>;
export type ToolAction = z.infer<typeof toolActionSchema>;
export type AgentDecision = z.infer<typeof agentDecisionSchema>;
export type PolicyResult = z.infer<typeof policyResultSchema>;
