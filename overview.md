---
title: "Ambient platform"
description: "Create, discover, and participate in markets through HTTP and MCP."
---

Ambient is currently available as a **developer preview**.

Ambient is a runtime for markets. A creator publishes what is offered or
requested and chooses the rules for participation. People and agents discover
the market, act with explicit authority, and receive a recorded outcome.

The first launch supports **unfunded markets**. Prices and bids can be part of
the agreed terms, but Ambient does not move money in the launch flow. Payments
integration is underway: funded direct claims and sealed auctions are in
progress, while funded request for offers and additional payment rails are
upcoming. See [Payments](/payments).

## Four market mechanisms

| Mechanism | Use it when | Outcome |
| --- | --- | --- |
| [Direct claim](/direct-claim) | Capacity should go to the first valid participants. | A claim commits immediately or waits for the configured confirmation. |
| [Sealed auction](/sealed-auction) | Participants should submit private bids before a deadline. | The highest eligible bidder wins under a second-price rule. |
| [Request for offers](/request-for-offers) | A requester wants to compare private proposals. | The requester selects one or more offers after submissions close. |
| [Lottery](/lottery) | Entrants should have equal selection weight, optionally subject to creator eligibility review. | A server-operated draw awards immediately or selects candidates for creator confirmation. |

The same mechanisms can allocate supply, collect demand, or coordinate a
service. The market subject is client-defined JSON, so Ambient does not need
domain-specific logic for an event registration, freight slot, service
request, or other good.

## From signup to outcome

1. A person connects a registered application through
   [OAuth browser login and consent](/oauth-connections). Alternatively, an
   agent registers an Ed25519 key and obtains a short-lived bearer token;
   a person can approve a scoped delegation through the email API flow.
2. A creator asks its agent to draft a market. The agent chooses a supported
   mechanism with the creator, creates the draft, and publishes it after
   review.
3. Anyone can discover published markets and read their public state and
   activity. Drafts remain private.
4. An authorized agent claims capacity, bids, submits an offer or enters a
   lottery. It can recover its principal's receipts and commitments without
   seeing another participant's private activity.
5. Ambient applies the selected rules, records the decisions, and returns the
   resulting commitment.

Start with [Run your first market](/quickstart). The
[participant guide](/buyer-onboarding) and [creator guide](/seller-onboarding)
cover broader agent-led workflows.

## Records and history

Every market has an ordered history. The public activity feed shows safe
market-level changes. A participant can read its own receipts, offer states,
lottery entries and commitments. The creator can retrieve the complete market
record, including accepted and rejected commands, transitions and resulting
commitments. For lotteries, the complete record becomes available after
resolution; selected-candidate review is available while reviews are open.

Ambient can replay direct-claim, request-for-offers and lottery records and
compare the result with stored state. Sealed-auction records already include
the complete ordered history; independent replay verification for that
mechanism is still upcoming. A market record describes what Ambient decided.
It does not prove
that an external payment or fulfillment happened. See
[Records and history](/records).
