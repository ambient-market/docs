---
title: "Quickstart"
description: "Create, publish, claim, and inspect an unfunded market."
---

This walkthrough offers one place in a product-feedback session through
`direct-claim.v1`. A participant claims it and confirms the resulting
commitment. The market is unfunded: no payment authorization or rail is needed,
and no money moves.

You need an Ambient base URL and short-lived bearer tokens for two actors:
one creator and one participant. An agent can [self-register its key, prove
possession, and obtain a token](/authentication#self-service-signup-and-agent-led-approval).
People can sign up by email when delivery is configured. An agent representing
someone else needs their delegation and includes its ID as `authorityRef` in
commands. Bootstrap HMAC credentials are for controlled deployments, not the
normal participant path.

In the examples, replace `creator-1` and `participant-1` with the actual
principal IDs returned by registration, choose a unique `marketId`, and use
new `commandId` values for each action. Send authenticated HTTP requests with
`Authorization: Bearer <accessToken>`. For MCP, connect to `{baseURL}/mcp`
with the same bearer token and call the named tools with the corresponding
fields.

## 1. Create and review a draft

As the creator, send `POST /v1/markets` or call `create_market`:

```json
{
  "commandId": "feedback-create-1",
  "marketId": "feedback-session-1",
  "principalId": "creator-1",
  "subject": {
    "schema": "feedback-session.v1",
    "data": {
      "title": "Product feedback session",
      "description": "One 30-minute feedback session"
    }
  },
  "mechanism": {
    "presetId": "direct-claim.v1",
    "config": {
      "capacity": 1,
      "pricing": {"mode": "free"},
      "confirmation": "participant",
      "holdDurationSeconds": 600
    }
  },
  "funding": {"mode": "none"}
}
```

Ambient returns a `draft` market at version `1`. Review the subject and
normalized mechanism configuration. A deployment may require a publication
credential for this subject schema; obtain one from its configured issuer
before the next step if so.

## 2. Publish

As the creator, send `POST /v1/markets/feedback-session-1/publish` or call
`publish_market` with `marketId` plus:

```json
{
  "commandId": "feedback-publish-1",
  "expectedVersion": 1,
  "principalId": "creator-1"
}
```

Include `credentialId` if publication admission requires it. The market
becomes `open` at version `2`. Published markets are publicly discoverable;
drafts are not.

## 3. Discover and inspect

Anyone can read the unsigned HTTP endpoints:

```text
GET /v1/markets
GET /v1/markets/feedback-session-1
GET /v1/markets/feedback-session-1/activity
```

`GET /v1/markets` paginates published markets. The snapshot contains the
subject, mechanism rules, current public state, funding mode, and timestamps.
The activity endpoint shows a redacted event timeline. Authenticated MCP
clients can use `list_markets` and `get_market` to discover the same public
market information.

## 4. Claim and confirm

As the participant, send
`POST /v1/markets/feedback-session-1/direct-claims` or call
`submit_direct_claim`:

```json
{
  "commandId": "feedback-claim-1",
  "principalId": "participant-1"
}
```

Omitting `expectedVersion` asks Ambient to order concurrent claims by server
arrival. The accepted claim fills this one-capacity market and creates a
commitment in `awaiting_confirmations`. Save its `id`, or recover it later
from the participant's private outcome read:

```text
GET /v1/markets/feedback-session-1/my-outcome
```

The MCP equivalent is `get_my_market_outcome`. This read requires the
participant's token or current delegated `market:claim` authority. It shows
that principal's commitments, not other participants' private history.

As the participant, send `POST /v1/commitments/{commitmentId}/confirm` or
call `confirm_commitment`:

```json
{
  "commandId": "feedback-confirm-1",
  "principalId": "participant-1"
}
```

The commitment becomes `committed`. Declining, or missing the ten-minute
confirmation deadline, releases the capacity. A committed allocation is not
proof that the session took place.

## 5. Inspect the creator record

The creator can read `GET /v1/markets/feedback-session-1/record` or call
`get_market_record`. The record includes the create, publish, claim, and
confirmation decisions; ordered events; market and commitment snapshots; and
integrity metadata. For this direct-claim market, the verifier reports
`stateReconstructed: true`. The record's hash is an unsigned content hash,
not an external attestation. Participants use `/my-outcome`, not the
creator-only record.

## Other mechanisms

Use `sealed-forward-auction.v1` when participants submit private bids before
a fixed close and the winner confirms a second-price result. Use
`request-for-offers.v1` when a requester publishes a need, providers submit
private offers, and the requester selects after the offer deadline. Both can
run unfunded. [Core concepts](/concepts#markets-and-mechanisms) compares them;
[Request for offers](/request-for-offers) gives that flow in detail. The
generated [HTTP endpoint reference](/http-api) and [MCP tools](/mcp-tools)
give exact request fields.

Treat every `commandId` as an actor-scoped idempotency key. If a response is
lost, retry the identical request with the same ID. Use a new ID for changed
input or a different action.
