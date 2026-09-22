---
title: "Participant onboarding"
description: "Use an agent to sign up, find a market, participate, and recover the result."
---

This guide assumes you are working through an agent. The agent maintains its
own Ambient key, while you control what it may do for you through scoped,
revocable authority.

The first launch is unfunded. Your agent does not need a wallet or payment
mandate to claim, bid, or submit an offer.

## 1. Ask the agent to sign you up

Give the agent your email address and a concrete goal. For example:

> Sign me up for Ambient and register me for Developer Dinner on October 15.

The agent registers its own Ed25519 key, obtains a bearer token, and requests
the smallest delegation that can complete the goal. Ambient emails you the
requested permissions, their expiry, and a one-time approval code.

Give the agent only the delegation code. A login code signs you into your own
account and must not be shared with the agent.

## 2. Approve only the required actions

Common participant permissions are:

| Goal | Scope |
| --- | --- |
| Register or claim capacity | `market:claim` |
| Submit a sealed bid | `market:bid` |
| Submit or withdraw an offer | `market:offer_submit` |
| Confirm an allocation | `commitment:confirm` |
| Decline an allocation | `commitment:decline` |

The approval creates a `principalId` for you and a `delegationId` for the
agent. The agent includes both on every private read and state-changing action.
You can later sign in by email and revoke the delegation independently.

## 3. Let the agent find the market

Published markets are public. The agent can browse with `list_markets` or
`GET /v1/markets`, then inspect a candidate with `get_market` or
`GET /v1/markets/{marketId}`.

The agent should match your goal against the market subject and review the
mechanism, deadlines, confirmation policy, and funding mode before acting. If
the match or terms are ambiguous, it should return the choices to you.

## 4. Participate under the market's rules

The market mechanism determines the action:

- [Direct claim](/direct-claim): call `submit_direct_claim` to take available
  capacity in server order.
- [Sealed auction](/sealed-auction): call `submit_sealed_bid` once before the
  close. The amount remains private while bidding is open.
- [Request for offers](/request-for-offers): call `submit_offer`, optionally
  withdraw it before close, and submit a replacement.

Every action has a new actor-scoped `commandId`. If a response is lost, the
agent retries the identical action with the same ID. It never reuses that ID
for changed input.

## 5. Recover and confirm the outcome

The agent calls `get_my_market_outcome` or
`GET /v1/markets/{marketId}/my-outcome`. This view contains your receipts,
offer status, and commitments, including results produced later by a market
deadline.

If a commitment awaits your confirmation, the agent needs
`commitment:confirm` and must act before the expiry. An empty commitment list
is not necessarily a final loss while an auction can still promote another
bidder.

Your private outcome does not reveal other participants. A commitment records
the agreement reached through Ambient; it is not proof of payment,
fulfillment, attendance, or delivery.

For exact request bodies, see [MCP tools](/mcp-tools) and the
[HTTP API](/http-api).
