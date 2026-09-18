---
title: "Core concepts"
description: "The identity, lifecycle, mechanism, commitment, and audit concepts shared by every Ambient interface."
---

## Identity and authority

A **principal** owns the rights and obligations created by a market action. An
**actor** sends the command. When they differ, a persisted **delegation** must
authorize that actor, principal, command scope, and time.

The transport authenticates the actor; it never trusts an `actorId` supplied
in a request body. The application then authorizes either:

- self-representation, where actor and principal IDs match; or
- an active delegation identified by `authorityRef` with the exact required
  scope.

The implemented scopes are `market:create`, `market:publish`, `market:claim`,
`market:bid`, `commitment:confirm`, and `commitment:decline`.

## Markets and mechanisms

A **market** binds a domain-specific subject to a versioned mechanism. Ambient
stores the subject as a schema name and JSON object without interpreting its
domain semantics.

```json
{
  "subject": {
    "schema": "restaurant-table.v1",
    "data": {
      "partySize": 2,
      "startsAt": "2026-09-19T19:00:00Z"
    }
  },
  "mechanism": {
    "presetId": "sealed-forward-auction.v1",
    "config": {}
  }
}
```

A **mechanism preset** owns validation, mutable mechanism state, allocation or
resolution, and any release or promotion behavior. Callers choose the preset
and its commercial rules explicitly; Ambient does not silently select them.

Markets move from `draft` to `open`, then to `closed` when the mechanism has
finished allocating or resolving them.

### `direct-claim.v1`

The first valid eligible claim receives one unit of capacity. Configuration
sets capacity, free or posted pricing, required confirmation parties, and a
hold duration when confirmation is required. Claims may omit
`expectedVersion`; the server then orders concurrent claims by authoritative
arrival rather than client time.

### `sealed-forward-auction.v1`

The preset accepts one private bid per principal until a fixed close. It
selects the highest eligible bid, using authoritative command order to break
ties. The winner pays the greater of the reserve and the second-highest
eligible bid; a sole bidder pays the reserve, or zero when no reserve exists.
No eligible bid produces `no_trade`.

Bid amounts are private execution data. While the auction is open, receipts,
events, and the creator-visible command record omit the amount. The public
market state exposes the bid count, not bid contents.

## Commitments

Resolution and commitment are separate. A mechanism may identify provisional
terms without making them immediately binding.

```text
provisional -> awaiting_confirmations -> committed
                                  |----> declined
                                  |----> expired
                                  `----> failed
```

Direct claims can require the creator, participant, both, or neither to
confirm. Sealed-auction winners must confirm within the configured hold. A
declined or expired direct claim releases capacity. A declined or expired
auction winner is excluded and the next eligible bidder is promoted with a
recomputed second price; the process can end in `no_trade`.

Commitment terms preserve the exact subject and price used in the decision.
They do not represent payment or fulfillment.

## Commands, decisions, and events

Every state-changing request is a **command** with an actor-scoped command ID.
Ambient records whether it was accepted or deterministically rejected.
Accepted commands also produce ordered **events** describing their state
transitions. Rejected commands remain in the journal but produce no transition
events.

Server time and server-assigned command order are authoritative. Client
timestamps are rejected. Timer firings are system-authored commands rather
than invisible background mutations.

Repeating the same command ID and content as the same actor returns the stored
decision. Reusing that ID with different content is an idempotency conflict.

## The authoritative record

The creator principal or creating actor can retrieve a record containing:

- the current market snapshot;
- accepted and rejected commands in server order;
- current commitments;
- accepted transition events; and
- integrity metadata for the returned, disclosure-filtered view.

The record hash is a stable content identifier, not an operator signature or
external proof. `stateReconstructed` is true only when the current verifier has
independently reproduced the stored snapshots from ordered events. That
reconstruction currently covers `direct-claim.v1`; other presets still receive
a content hash with `stateReconstructed: false`.

The current verifier's limits are summarized above; signatures and external
anchoring are not implemented.
