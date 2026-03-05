# Decision Examples

## Example 1: Billing message auto-executed

Input subject:
`Invoice issue`

Decision summary:
- intent: `billing_question`
- priority: `medium`
- confidence: `0.83`
- policy: `AUTO_EXECUTE`
- action: `update_record {"queue":"billing","status":"open"}`

## Example 2: Access request routed to review

Input subject:
`Need access to analytics workspace`

Decision summary:
- intent: `access_request`
- priority: `high`
- confidence: `0.78`
- policy: `REQUIRE_REVIEW`
- reason: `High-risk intent requires elevated confidence or human approval.`
- suggested action: `create_task {"queue":"it-access","severity":"high"}`

## Example 3: Technical issue auto-executed with two actions

Input subject:
`App login bug`

Decision summary:
- intent: `technical_issue`
- priority: `high`
- confidence: `0.86`
- policy: `AUTO_EXECUTE`
- actions:
  - `create_task {"queue":"engineering-support","severity":"high"}`
  - `draft_reply {"template":"incident_ack"}`
