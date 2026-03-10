# Demo Runbook (Under 5 Minutes)

## Command

```bash
SLACK_OUTBOUND_MODE=live npm run slack:live
```

## Live Slack Portfolio Capture (recommended order)

1. Post an auto-execute message in Slack (billing style):
- Example: `We noticed duplicate charges in this month invoice. Please investigate billing.`

2. Capture thread response that includes record evidence:
- Look for `Handled automatically` plus `Evidence=CRM updated ... record_id=... ref=...`

3. Capture local CRM update ledger proof (works in mock handoff mode too):
```bash
tail -n 5 logs/mock-crm-updates.jsonl
```

4. Post a review-worthy message in Slack:
- Example: `Can the external audit team get time with our finance department next week?`

5. Capture thread response that shows human-routing:
- First reply: `Routed to human review...`
- Second reply: `Escalation: notified <@USER_ID> ...`
- Also capture one DM window proving reviewer notification delivery

6. Capture audit proof in terminal:
```bash
rg -n "tool_execution|policy|decision" logs/audit-slack-live.jsonl | tail -n 20
```

7. Capture infrastructure proof (optional):
- ngrok 200 responses or server logs while Slack events arrive

## Demo narrative

- Start with operational pain: all requests manually triaged.
- Show controlled autonomy: low-risk/high-confidence requests auto-execute with a traceable reference.
- Show governance: uncertain requests route to human review and explicitly notify accountable owners.
- End with measurable value: reduced response time plus auditable controls.

## Gmail Live Capture (Reply Tool)

Use this when you want screenshot evidence of true email replies from the agent.

Command:
```bash
GMAIL_MODE=live GMAIL_REPLY_MODE=live GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='subject:"[AGENT-LIVE-TEST]" newer_than:1d' GMAIL_REPLY_ALLOWLIST='your-test-sender@example.com' npm run gmail:live
```

Capture these artifacts:
- Original inbound test email in Gmail
- Outbound agent reply in the same thread
- `reports/gmail-live-demo.json` showing `replies_sent`
- `logs/audit-gmail-live.jsonl` lines with `stage:"gmail_reply"` and `sent:true`
