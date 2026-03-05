# Dataset Plan

## Cycle 1 strategy

Use synthetic + lightly adapted public-style examples to avoid privacy risk while keeping realism.

## Intent taxonomy (initial)

- Access request
- Billing question
- Contract/status request
- Technical issue
- Onboarding request
- Escalation/complaint
- Meeting/scheduling
- General information request

## Required fields per labeled sample

- `message_id`
- `raw_text`
- `intent_label`
- `priority_label` (`low|medium|high`)
- `entities` (key-value map)
- `expected_action`
- `requires_human_review` (boolean)

## Volume targets

- Training/dev set: 160 samples
- Validation set: 40 samples
- Coverage: at least 15 samples per intent class where possible

## Quality checklist

- Include ambiguity and noisy language
- Include multi-intent messages
- Include edge cases with missing entities
- Include high-risk requests requiring manual approval

## Storage

- `data/messages_train.jsonl`
- `data/messages_val.jsonl`
- `data/schema.json`
