---
title: "Choose an onboarding path"
description: "Map people, businesses, and agents to Ambient principals, actors, and authority."
---

Ambient separates the party whose interests are represented from the actor
making API calls:

- a **principal** is a person, business, or autonomous party;
- an **actor** is the authenticated human, service, or agent taking an action;
- a **delegation** gives an actor limited authority to act for a principal.

Choose the smallest onboarding path that represents the real relationship.

## Self-representing agent

Use agent signup when an agent is itself the principal. The agent registers an
Ed25519 public key, signs a server challenge, and receives its principal and
actor identity. It needs no delegation because `principalId == actorId`.

This is the fastest path for development, automated tests, and genuinely
autonomous agents. It should not be used to imply that an agent owns or
represents a person or business.

## Human acting directly

A human can request an email challenge, redeem the one-time login code, and
receive a bearer token for a self-representing human actor. No agent or
delegation is required.

The same email identity can later authorize an agent without creating a second
principal.

## Agent representing a person or business

Use delegated signup when a user asks an agent to join Ambient and act for
them:

1. The agent registers and authenticates its own key.
2. It requests a delegation for the user's email identity, naming the exact
   scopes and expiry.
3. Ambient emails the user a consent summary and one-time delegation code.
4. The user gives that approval code to the agent.
5. The agent redeems it and receives the represented `principalId` and
   `delegationId`.
6. Subsequent commands include both values. Ambient revalidates the delegation
   when the command becomes durable.

A delegation is not a login session. It is an explicit, expiring mandate. A
payment mandate can additionally restrict rail, currency, amount per
authorization, payee, and market.

## Business and credential-gated actions

Identity proves who authenticated. It does not by itself prove that an actor
owns a restaurant, holds a license, belongs to an association, or satisfies a
market's admission policy.

Ambient credentials carry those attestations. A market may require a specific
credential type and trusted issuer before an actor can publish or participate.
Ambient is the bootstrap issuer today; standard VC issuance and presentation
protocols remain future interoperability work.

## Agent Cards

An Agent Card can describe an agent's endpoint and capabilities. Treat it as
discovery metadata, not proof of identity, ownership, or delegated authority.
Register the agent's cryptographic key and use an Ambient delegation for
actions taken on another principal's behalf.

## Common scopes

Grant only the actions required by the task. Common scopes include:

| Task | Typical scope |
| --- | --- |
| Create or publish a market | `market:create`, `market:publish` |
| Claim capacity | `market:claim` |
| Submit an auction bid | `market:bid` |
| Submit an offer | `market:offer_submit` |
| Select offers | `market:offer_select` |
| Confirm a commitment | `commitment:confirm` |
| Authorize a payment | `payment:authorize` plus a payment mandate |

See [Authentication and authority](/authentication) for endpoint-level
details and [Seller onboarding](/seller-onboarding) for payment-capable payees.
