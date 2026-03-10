# Enterprise Inbox-to-Workflow Agent

Business-first applied AI project that converts high-volume enterprise inbox traffic into reliable, auditable workflow execution.

## Current status

Cycle 1 + Cycle 2 now include:
- JSONL inbox ingestion and normalization
- intent/priority/action decision engine (heuristic baseline)
- policy gating (`AUTO_EXECUTE`, `REQUIRE_REVIEW`, `DENY`)
- mock tool execution with audit logging
- evaluation harness with reproducible metrics
- demo/review queue artifacts for portfolio walkthroughs
- offline channel adapters for Slack events and email threads
- Slack live webhook integration with request signature verification
- Gmail live ingestion runner with mock/live API mode
- ticketing and CRM business handoff adapters
- explicit human review state workflow (`PENDING`, `APPROVED`, `REJECTED`)

## Quick start

```bash
npm install
npm run dev
```

Useful commands:
- `npm run typecheck`
- `npm run test`
- `npm run demo`
- `npm run demo:channels`
- `npm run slack:live`
- `npm run gmail:live`
- `npm run demo:handoff`
- `npm run demo:review`
- `npm run review:decide`
- `npm run review:metrics`
- `npm run eval`
- `npm run build`

## Demo + evaluation

```bash
npm run demo
npm run demo:channels
npm run gmail:live
npm run demo:handoff
npm run demo:review
npm run review:metrics
npm run eval
```

Outputs:
- Demo summary: `reports/demo-summary.md`
- Review queue report: `reports/review-queue.md`
- Channel integration demo: `reports/channel-integration-demo.md`
- Gmail integration demo: `reports/gmail-live-demo.md`
- Business handoff demo: `reports/handoff-demo.md`
- Review workflow: `reports/review-workflow.md`
- Review metrics: `reports/review-metrics.md`
- Evaluation report: `reports/eval-report.md`

## Gmail live + reply

1. Enable the Gmail API with `gmail.readonly` and `gmail.send` scopes (see `docs/setup-manifests/google-gmail-oauth.template.json`).
2. Populate these env vars before running live ingestion: `GMAIL_ACCESS_TOKEN`, `GMAIL_QUERY` (e.g., `subject:"[AGENT-LIVE-TEST]" newer_than:1d`), `GMAIL_REPLY_MODE=live`, and `GMAIL_REPLY_ALLOWLIST` with the sender(s) you want to reply to.
3. Execute
```bash
GMAIL_MODE=live GMAIL_REPLY_MODE=live \
  GMAIL_QUERY='subject:"[AGENT-LIVE-TEST]" newer_than:1d' \
  GMAIL_REPLY_ALLOWLIST='aerissat@youngtoon.com,hallo@tatua.site' \
  GMAIL_ACCESS_TOKEN=... \
  npm run gmail:live
```
Auto-reply actions are recorded as `stage: "gmail_reply"` in `logs/audit-gmail-live.jsonl`; review/deny outcomes do not trigger replies.

## Project structure

- `src/slack-live-server.ts`: live Slack webhook ingestion server
- `src/gmail-live-runner.ts`: Gmail ingestion runner
- `src/integrations-business-handoff.ts`: ticketing/CRM adapter layer
- `src/review-workflow.ts`: human review state and metrics model
- `docs/CODE_EXECUTION_PATH.md`: non-technical execution walkthrough
- `docs/INSTALLATION_TUTORIAL.md`: non-technical workplace setup by integration platform
- `docs/CYCLE2_IMPLEMENTATION_PLAN.md`: ordered cycle plan and done criteria

## MVP boundary

Use synthetic inbox events in this repository. Keep connectors modular so Slack/Gmail/Outlook/Jira/CRM live adapters can be added with limited core changes.




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

## Step 1.5: Create a public HTTPS URL for Slack events (local machine testing)

Use this only when running locally on your laptop/desktop.

Slack must send events to a public HTTPS URL. For local testing, use `ngrok`.

### A) Install ngrok

macOS (Homebrew):

```bash
brew install ngrok/ngrok/ngrok
```

Windows (winget):

```bash
winget install ngrok.ngrok
```

### B) Create free ngrok account and connect it

1. Go to [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) and create a free account.
2. In ngrok dashboard, open **Your Authtoken**.
3. Copy the token.
4. In terminal, run:

```bash
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

### C) Start your Slack server locally

In project folder:

```bash
npm run slack:live
```

You should see:
- `Slack live server listening on http://localhost:8787/slack/events`

### D) Open HTTPS tunnel to your local app

In a second terminal:

```bash
ngrok http 8787
```

ngrok will show a Forwarding URL like:
- `https://abcd-12-34-56-78.ngrok-free.app`

### E) Connect that URL to Slack

1. Open your Slack app settings at [api.slack.com/apps](https://api.slack.com/apps)
2. Go to **Event Subscriptions**
3. Turn **Enable Events** ON
4. Set Request URL to:
- `https://abcd-12-34-56-78.ngrok-free.app/slack/events`
5. Save changes

### F) Keep both terminals running during testing

- Terminal 1: `npm run slack:live`
- Terminal 2: `ngrok http 8787`

If you stop either one, Slack events will fail.

## Step 1.6: Important note for remote servers

If your app is running on a remote Linux server with a real public domain and HTTPS, you usually do **not** need ngrok.

In production/workplace environments, preferred path is:
- Open HTTPS ingress on your cloud + VM
- Serve your app behind Caddy or Nginx with TLS
- Configure Slack directly with your domain:
- `https://your-domain.com/slack/events`

## Step 1.7: Install on a remote Linux server (GCP/OCI/AWS/Azure style)

This section is for persistent deployment on a cloud VM.

Important:
- On a remote Linux server with a real domain and valid HTTPS, you do **not** use ngrok.
- Slack can call your server directly at `https://your-domain.com/slack/events`.
- ngrok is only for local machine testing when your laptop is not publicly reachable.

Assumptions:
- Ubuntu 22.04 (or similar)
- You have a domain name pointing to the server public IP
- You can SSH into the server with sudo access

### A) Connect to your server

```bash
ssh <your-user>@<your-server-ip>
```

### B) Install Node.js and app dependencies

```bash
sudo apt update
sudo apt install -y curl unzip git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Clone/copy project:

```bash
git clone <YOUR_REPO_URL> enterprise-inbox-agent
cd enterprise-inbox-agent
npm install
npm run typecheck
```

### C) Configure app environment

```bash
nano .env
```

Example minimum values:

```env
SLACK_SIGNING_SECRET=<your-signing-secret>
SLACK_BOT_USER_OAUTH_TOKEN=<your-bot-user-oauth-token>
SLACK_OUTBOUND_MODE=live
PORT=8787
```

### D) Keep app running with systemd

Create service:

```bash
sudo nano /etc/systemd/system/inbox-agent.service
```

Paste:

```ini
[Unit]
Description=Enterprise Inbox Workflow Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/<your-user>/enterprise-inbox-agent
ExecStart=/usr/bin/npm run slack:live
Restart=always
RestartSec=5
User=<your-user>
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable inbox-agent
sudo systemctl start inbox-agent
sudo systemctl status inbox-agent --no-pager
```

### E) Open ports 80/443 (cloud + VM firewall)

You need both layers configured:
- Cloud network firewall/security rules
- OS firewall on the VM (if enabled)

Why both 80 and 443:
- `443` serves HTTPS traffic
- `80` is often needed for automatic certificate validation (Let’s Encrypt)

#### GCP (Google Cloud)

In GCP, this is done mainly through **VPC Firewall Rules** attached to your VM network/tags.

Checklist:
1. Open Google Cloud Console -> VPC network -> Firewall.
2. Create or update a rule that targets your VM (network tag or all instances).
3. Ingress allow TCP ports `80,443` from source `0.0.0.0/0`.
4. Confirm your VM has the matching network tag if rule is tag-based.

Common GCP pitfall:
- Firewall rule exists, but VM does not have the rule's target tag.

#### OCI (Oracle Cloud)

In OCI, ingress can be controlled at two different layers:
- Security Lists (subnet level)
- Network Security Groups (VNIC/instance level)

Checklist:
1. Open OCI Console -> Networking -> Virtual Cloud Networks.
2. Check subnet Security List rules for ingress TCP `80` and `443` from `0.0.0.0/0`.
3. If NSG is used, also add ingress TCP `80` and `443` there.
4. Verify your instance VNIC is actually attached to that NSG.

Common OCI pitfall:
- Port opened in Security List but blocked in NSG (or vice versa).

#### VM firewall (Ubuntu UFW) if enabled

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### F) Configure TLS with Caddy (recommended simpler option)

Caddy is easiest for non-technical installs because TLS certificates are automatic.

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Create Caddy config:

```bash
sudo nano /etc/caddy/Caddyfile
```

Example:

```caddy
your-domain.com {
    reverse_proxy 127.0.0.1:8787
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy will automatically provision TLS certificates if DNS and ports are correct.

Quick verification:
```bash
curl -I https://your-domain.com/slack/events
```

You should get an HTTPS response (even if method/path is not fully handled by GET).

### G) Configure TLS with Nginx (alternative)

Nginx is also valid, but TLS is usually handled by Certbot after base reverse proxy is set.

Install Nginx + Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create Nginx site config:

```bash
sudo nano /etc/nginx/sites-available/inbox-agent
```

Example HTTP reverse-proxy block:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test config:

```bash
sudo ln -s /etc/nginx/sites-available/inbox-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

After Certbot, Nginx is usually updated with:
- HTTPS listener on `443`
- certificate paths
- HTTP -> HTTPS redirect

Verify:
```bash
sudo nginx -t
curl -I https://your-domain.com/slack/events
```

### H) Connect Slack directly to your domain

In Slack App -> Event Subscriptions -> Request URL:

- `https://your-domain.com/slack/events`

If verification succeeds, Slack is connected.

### I) Verify remote runtime

```bash
journalctl -u inbox-agent -f
```

Post a message in Slack channel and confirm:
- Bot responds in thread
- New entries appear in app logs

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

Local credentials file:
- `.env` (already supported by runtime)
- Never commit this file

Required runtime values:
- `SLACK_SIGNING_SECRET`
- Optional for live replies: `SLACK_BOT_TOKEN` or `SLACK_BOT_USER_OAUTH_TOKEN`
- Optional default human reviewers: `SLACK_REVIEW_OWNER_USER_ID` (one or comma-separated Slack user IDs, e.g. `U123ABC456,U234BCD567`)
- Optional queue-based reviewer routing: `SLACK_REVIEW_QUEUE_OWNERS_JSON` (JSON map like `{"billing":["U123...","U234..."],"revops":"U456..."}`)

Start local server in safe mode:

```bash
npm run slack:live
```

Run local signed test request:

```bash
npm run slack:test
```

Expected result:
- `npm run slack:test` returns HTTP status `200`
- `logs/audit-slack-live.jsonl` receives new entries

Events endpoint for Slack cloud events:
- `https://<your-host>/slack/events`

To enable live threaded replies after install:

```bash
SLACK_OUTBOUND_MODE=live npm run slack:live
```

### Slack real-workspace test checklist

1. Invite the bot to your channel:
- In Slack channel, run `/invite @<your-bot-name>`

2. Post a test message in that channel, for example:
- `Need access to billing dashboard for finance close`

3. Confirm bot response appears in thread.

4. For human-review notification proof, set reviewers and retest:
- In `.env`: `SLACK_REVIEW_OWNER_USER_ID=<SLACK_USER_ID_1>,<SLACK_USER_ID_2>,<SLACK_USER_ID_3>`
- Restart server and post a review-worthy message (for example: `Can the external audit team get time with our finance department next week?`)
- Confirm second bot thread reply mentions the reviewer(s) as `<@USER_ID>` and each reviewer receives a DM from the bot

5. Confirm logs update:
- `logs/audit-slack-live.jsonl`

6. Take screenshots/recordings of:
- Slack app Event Subscriptions page with verified Request URL
- Terminal with `npm run slack:live` (or `systemctl status inbox-agent` on server)
- Auto-execute thread showing `Evidence=... record_id=... ref=...` (record update proof)
- Review thread showing reviewer mention notification plus one reviewer DM window
- `logs/mock-crm-updates.jsonl` showing new record update entry
- Audit log lines showing `decision`, `policy`, and `tool_execution` stages

## Gmail (Available now)

Use this setup file:
- `docs/setup-manifests/google-gmail-oauth.template.json`

Required values:
- `GMAIL_ACCESS_TOKEN`
- `GMAIL_REPLY_MODE` (`mock` or `live`)
- `GMAIL_REPLY_ALLOWLIST` (comma-separated emails; required when reply mode is `live`)

Mock mode first:

```bash
npm run gmail:live
```

Live ingestion only (no outbound reply):

```bash
GMAIL_MODE=live GMAIL_REPLY_MODE=mock GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='newer_than:7d' npm run gmail:live
```

Controlled live reply mode:

```bash
GMAIL_MODE=live GMAIL_REPLY_MODE=live GMAIL_ACCESS_TOKEN=... GMAIL_QUERY='subject:"[AGENT-LIVE-TEST]" newer_than:1d' GMAIL_REPLY_ALLOWLIST='your-test-sender@example.com' npm run gmail:live
```

Expected live-reply behavior:
- Auto-execute + `reply` action: Gmail reply is sent in-thread
- Review/deny outcomes: no Gmail reply is sent
- Reply events are logged under `stage: "gmail_reply"` in `logs/audit-gmail-live.jsonl`

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
- Run `npm run slack:test` to verify local signature flow

If Slack live server fails with `EADDRINUSE` (port already in use):
- Find the existing process: `lsof -nP -iTCP:8787 -sTCP:LISTEN`
- Stop it: `kill <PID>`
- Or start on another port: `PORT=8788 npm run slack:live`
- If using ngrok, match that port: `ngrok http 8788`

If Gmail live mode fails:
- Check `GMAIL_ACCESS_TOKEN` validity and permissions

If Gmail live reply mode sends no replies:
- Confirm `GMAIL_REPLY_MODE=live`
- Confirm `GMAIL_REPLY_ALLOWLIST` contains the sender email
- Confirm message policy outcome is `AUTO_EXECUTE` and action includes `reply`

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
