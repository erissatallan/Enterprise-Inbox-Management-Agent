# Installation Tutorial (Workplace Setup Guide)

This guide is for non-technical users who want to set up this system in a workplace.

## What this system does in simple terms

- Reads incoming business messages (chat/email)
- Decides what type of request each message is
- Either handles it automatically or sends it to review
- Logs everything for traceability

## Before you start

You need support from one technical person in your company for initial credentials.

Minimum requirements:
- A computer/server where the app can run
- Access to your company Slack and/or email platform
- Permission to create app credentials (tokens/secrets)

## High-level setup flow

1. Choose the platforms you want to connect.
2. Use the matching setup file in `docs/setup-manifests/`.
3. Collect credentials for those platforms.
4. Enter those credentials as environment variables.
5. Run the relevant command for each platform.
6. Verify output reports and logs.

## Step 1: Core app setup (once)

From the project folder:

```bash
npm install
npm run typecheck
npm run test
```

## Step 2: Platform setup sections

## Slack (Available now)

Use this setup file:
- `docs/setup-manifests/slack-app-manifest.yaml`

How to use it:
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click `Create New App`
3. Choose `From a manifest`
4. Paste content from `slack-app-manifest.yaml`
5. Replace `https://YOUR_HOST/slack/events` with your real URL
6. Install app to workspace

Required runtime values:
- `SLACK_SIGNING_SECRET`
- Optional for live replies: `SLACK_BOT_TOKEN`

Start in safe mode:

```bash
SLACK_SIGNING_SECRET=... SLACK_OUTBOUND_MODE=mock npm run slack:live
```

Events endpoint configured in Slack:
- `https://<your-host>/slack/events`

## Gmail (Available now)

Use this setup file:
- `docs/setup-manifests/google-gmail-oauth.template.json`

Required value:
- `GMAIL_ACCESS_TOKEN`

Mock mode first:

```bash
npm run gmail:live
```

Live mode:

```bash
GMAIL_MODE=live GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='newer_than:7d' npm run gmail:live
```

## Jira / Linear Ticketing Handoff (Available now)

Use this setup file:
- `docs/setup-manifests/business-handoff-webhooks.template.env`

Mock mode:

```bash
BUSINESS_HANDOFF_MODE=mock TICKETING_PROVIDER=jira npm run demo:handoff
```

Alternative provider:

```bash
BUSINESS_HANDOFF_MODE=mock TICKETING_PROVIDER=linear npm run demo:handoff
```

Live mode requires:
- `BUSINESS_HANDOFF_MODE=live`
- `TICKETING_WEBHOOK_URL=<endpoint>`

## HubSpot / Salesforce CRM Handoff (Available now)

Use this setup file:
- `docs/setup-manifests/business-handoff-webhooks.template.env`

Mock mode:

```bash
BUSINESS_HANDOFF_MODE=mock CRM_PROVIDER=hubspot npm run demo:handoff
```

Alternative provider:

```bash
BUSINESS_HANDOFF_MODE=mock CRM_PROVIDER=salesforce npm run demo:handoff
```

Live mode requires:
- `BUSINESS_HANDOFF_MODE=live`
- `CRM_WEBHOOK_URL=<endpoint>`

## Human Review Workflow (Available now)

This adds a controlled human approval step.

1. Generate pending review items:

```bash
npm run demo:review
```

2. Approve or reject each item:

```bash
REVIEW_MESSAGE_ID=<id> REVIEW_DECISION=APPROVED REVIEWER_NAME=<name> npm run review:decide
```

or

```bash
REVIEW_MESSAGE_ID=<id> REVIEW_DECISION=REJECTED REVIEWER_NAME=<name> npm run review:decide
```

3. Generate review metrics:

```bash
npm run review:metrics
```

Output files:
- `logs/review-items.jsonl`
- `logs/review-decisions.jsonl`
- `reports/review-workflow.md`
- `reports/review-metrics.md`

## Outlook / Microsoft Graph (Planned)

Use this setup file:
- `docs/setup-manifests/microsoft-graph-mail.template.json`

Status:
- Not implemented yet in this codebase.

## Microsoft Teams (Planned)

Use this setup file:
- `docs/setup-manifests/microsoft-teams-bot.template.json`

Status:
- Not implemented yet in this codebase.

## Step 3: Verify business behavior

```bash
npm run demo
npm run demo:channels
npm run gmail:live
npm run demo:handoff
npm run demo:review
npm run review:metrics
npm run eval
```

## Step 4: Go-live checklist

- Start with mock mode for each integration
- Confirm review routing and decision logs are working
- Confirm logs are written for every run
- Enable live mode one platform at a time
- Keep one designated reviewer for the first week

## Troubleshooting

If Slack requests are rejected:
- Check `SLACK_SIGNING_SECRET`
- Check Slack URL points to `/slack/events`

If Gmail live mode fails:
- Check `GMAIL_ACCESS_TOKEN` validity and permissions

If handoff fails in live mode:
- Check `BUSINESS_HANDOFF_MODE=live`
- Check webhook URLs are reachable

If review decisions fail:
- Check `REVIEW_MESSAGE_ID` exists in `logs/review-items.jsonl`
- Check `REVIEW_DECISION` is `APPROVED` or `REJECTED`

## Ownership model for workplace rollout

Recommended roles:
- Operations owner: review policy and queue monitoring
- IT/admin owner: credential and secret management
- Technical owner: runtime, logs, and incident response

## Document maintenance note

This tutorial should be updated whenever a new platform integration is added or command/env names change.
