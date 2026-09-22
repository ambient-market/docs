---
title: "Records and history"
description: "Understand public activity, participant outcomes, creator records, and replay."
---

Ambient records every market action that reaches its application boundary.
Different readers receive different views of that history.

## Public activity

Anyone can read:

```text
GET /v1/markets/{marketId}/activity
```

This timeline shows safe lifecycle changes, counts, market states, and public
outcomes. It does not reveal participant identities, private bids or offers,
commitment IDs, authority references, or payment records.

Use public activity to display what is happening in a market. Do not treat it
as the complete audit record.

## Participant outcome

An authenticated participant or its authorized agent can read:

```text
GET /v1/markets/{marketId}/my-outcome
```

The MCP equivalent is `get_my_market_outcome`. It returns the represented
principal's own bid receipts, offer states, and commitments beside the public
market snapshot. It never returns another participant's private outcome.

Use this view to recover from a lost response or discover a result produced by
a later deadline.

## Creator record

The creator can read:

```text
GET /v1/markets/{marketId}/record
```

The MCP equivalent is `get_market_record`. The record contains:

- the current market snapshot;
- accepted and deterministically rejected commands in server order;
- accepted transition events;
- current commitments;
- private offers for request-for-offers markets; and
- integrity metadata for the returned view.

The creator record is private. It is available to the creator principal or the
original creating actor while it still has current `market:create` authority.

## Replay and integrity

Ambient can independently replay direct-claim and request-for-offers records
and compare the result with stored market, offer, and commitment state. These
records report `stateReconstructed: true` when that comparison succeeds.

Sealed-auction records already contain the complete ordered history and a
content hash. Independent reconstruction of the stored auction state is not
implemented yet, so those records report `stateReconstructed: false`.

The record hash identifies the exact returned content. It is not a signature,
external timestamp, or proof against an operator able to rewrite the database
and recompute the hash.

## What a record does not prove

The record establishes what Ambient received, decided, and committed under the
published rules. It does not by itself establish that:

- a listed good or service existed;
- a participant paid;
- external fulfillment occurred;
- an attendee checked in; or
- either party completed an off-platform obligation.

Those facts require evidence from the systems that perform them.
