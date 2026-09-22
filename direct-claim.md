---
title: "Direct claim"
description: "Allocate capacity to the first valid participants."
---

Use `direct-claim.v1` when participants should take available capacity in
server order. Event registration, appointment booking, and fixed-capacity
access are common examples.

## Rules

The creator defines:

| Field | Meaning |
| --- | --- |
| `capacity` | Number of units available. |
| `pricing` | `free` or a posted amount and currency. |
| `confirmation` | Whether the creator, participant, both, or neither must confirm. |
| `holdDurationSeconds` | Time allowed for required confirmations. |

With `confirmation: none`, an accepted claim commits immediately. With
`confirmation: creator`, the first valid claimant holds capacity while the
creator approves or declines. This is the request-to-book shape.

## Participant flow

1. Read the published market and confirm its capacity, terms, and funding
   mode.
2. Call `submit_direct_claim` or
   `POST /v1/markets/{marketId}/direct-claims`.
3. If confirmation is required, act before the hold expires.
4. Recover the current commitment through `get_my_market_outcome` or
   `/v1/markets/{marketId}/my-outcome`.

Claims may omit `expectedVersion`. Ambient then orders concurrent claims by
authoritative server arrival. When a held claim is declined or expires, its
capacity becomes available again.

## Private handoff data

A market can publish a fulfillment request schema and accepted delivery
transports. The participant then includes a private request and delivery
endpoint with the claim. Ambient stores that handoff in the commitment and
creator record but does not invoke the endpoint or perform fulfillment.

## Disclosure and record

The public market shows remaining allocation state without exposing private
handoff data or participant commitments. The participant sees only its own
outcome. The creator record includes the ordered claim and commitment history,
and Ambient can independently replay this mechanism's stored state.

See [MCP tools](/mcp-tools#submit_direct_claim) and the
[HTTP API](/http-api) for exact fields.
