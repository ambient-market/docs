---
title: "Ambient platform"
description: "Infrastructure for creating deterministic markets and producing auditable outcomes."
---

Ambient is infrastructure for creating and running markets. A market creator
defines what is available and the rules for allocating it. Participants and
their agents submit claims or bids, and Ambient applies those rules
consistently, records the outcome, and tracks the resulting commitments.

A restaurant table is a useful example: the restaurant can offer a specific
table and time through fixed terms or a sealed auction, while diners or their
agents participate through HTTP or MCP. The same platform concepts apply to
other scarce goods, services, capacity, and access rights; restaurant-specific
behavior is not part of the kernel.

## Create and publish a market

Every market starts as a draft so its creator can review the allocation rules
before participants can act.

1. **Create the draft.** Choose a unique market ID, describe what is being
   allocated in `subject`, and choose the allocation rules in `mechanism`.
   Send these fields to `POST /v1/markets` or the `create_market` MCP tool.
2. **Review the result.** Ambient returns the draft, its current version, and
   the normalized mechanism configuration.
3. **Publish the draft.** Send the market ID and current version to
   `POST /v1/markets/{marketId}/publish` or the `publish_market` MCP tool. The
   market becomes open and participants can submit claims or bids.

Follow the [quickstart](/quickstart) for complete request bodies and a full
create, publish, claim, and confirmation flow. See the [HTTP API](/http-api)
or [MCP reference](/mcp) for exact inputs.

## What is implemented

Ambient currently provides:

- an HTTP API and MCP endpoint that accept one short-lived bearer credential
  issued from Ed25519 actor proof, over the same application services;
- explicit principal, actor, and delegated-authority checks;
- `direct-claim.v1` for free or posted terms, bounded capacity, optional holds,
  and configurable confirmation;
- `sealed-forward-auction.v1` for one indivisible opportunity, private bids, a
  fixed close, second-price resolution, an optional reserve, winner
  confirmation, and deterministic promotion after a winner declines or
  expires;
- a commitment lifecycle independent of mechanism resolution;
- actor-scoped command idempotency and optimistic concurrency;
- durable PostgreSQL deadlines for auction close and commitment expiry; and
- a creator-authorized record containing ordered commands, events,
  commitments, an integrity hash, and verified state reconstruction for direct
  claims.

Ambient does not currently provide:

- a consumer or operator user interface;
- public discovery;
- self-service accounts, credential issuance, or delegation management;
- self-service identity/key registration, OAuth, or verifiable-credential issuance;
- payment authorization, collection, escrow, settlement, refunds, or disputes;
- fulfillment orchestration; or
- participant notifications or subscriptions.

Price and currency fields are agreed terms, not evidence that money moved.

## Interfaces

HTTP clients submit JSON commands under `/v1`. Remote agent hosts connect to
the stateless Streamable HTTP MCP endpoint at `/mcp`. Both interfaces establish
an authenticated actor and call the same command and query services, so market
rules, authority, ordering, idempotency, persistence, and audit behavior are
shared.

Read the [core concepts](/concepts) for the lifecycle and vocabulary shared by
both interfaces.
