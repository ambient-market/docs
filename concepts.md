---
title: "Core concepts"
description: "The identities, authority, markets, commitments, and records shared by every Ambient workflow."
---

Ambient keeps a small set of concepts consistent across HTTP, MCP, and every
market mechanism.

## Principal and actor

A **principal** owns the rights and obligations created by a market. An
**actor** sends a request to Ambient.

A person acting directly can be both. An agent has its own actor identity and
usually represents a different principal. Ambient authenticates the actor,
then checks whether that actor may perform the requested action for the named
principal.

## Delegation

A **delegation** is a scoped, revocable grant from a principal to an agent.
It names the delegate actor, allowed actions, and optional expiry. Every
delegated command cites the delegation as `authorityRef`.

The implemented scopes are:

```text
market:create
market:publish
market:cancel
market:claim
market:bid
market:offer_submit
market:offer_select
commitment:confirm
commitment:decline
commitment:refund
credential:issue
payment:authorize
payment:register_payee_rail
```

Grant only the scopes needed for the current task. See
[Authentication and authority](/authentication) for signup, approval, and
revocation.

## Market

A **market** combines:

- a public subject describing what is offered or requested;
- a versioned mechanism describing how participants act and how an outcome is
  selected;
- capacity, timing, pricing, and confirmation rules; and
- an optional funding policy.

Markets begin as private drafts. Publication makes the reviewed rules and
public state discoverable. The first launch uses `funding.mode: none`, so any
price or bid is an agreement term rather than money collected by Ambient.

See [Market mechanisms](/mechanisms) for the three implemented choices.

## Commitment

A **commitment** records the agreement produced by a market. Depending on the
mechanism, it may be created immediately or wait for one or more principals to
confirm.

```text
provisional -> awaiting_confirmations -> committed
                                  |----> declined
                                  |----> expired
                                  `----> failed
```

Commitment terms preserve the subject, participants, price, and any private
handoff data used in the decision. A commitment does not prove that payment,
attendance, fulfillment, or delivery happened outside Ambient.

## Command and event

Every state-changing action is a **command** with an actor-scoped `commandId`.
Ambient records whether it was accepted or deterministically rejected.
Accepted commands produce ordered **events** describing their transitions.

Server order and server time are authoritative. An exact retry with the same
command ID returns the stored decision. Reusing the ID for changed input is an
idempotency conflict. Deadline firings are recorded system commands rather
than invisible background changes.

## Public and private views

Listed published market discovery, exact-ID snapshots, and activity are public.
An unlisted market is omitted from discovery but remains public to anyone who
knows its ID; unlisted is not private. Public views expose
rules, state, counts, and safe outcomes without revealing private bids,
offers, commitments, authority references, or payment records.
Market IDs are deterministically derived identifiers, not secrets; their
opacity must not be used as a confidentiality boundary.

An authenticated participant can read its own receipts, offer states, and
commitments. The creator has a separate full record. See
[Records and history](/records).
