---
title: "Request for offers"
description: "Publish a need, receive private offers, and select an unfunded agreement."
---

`request-for-offers.v1` starts with demand. A requester publishes a need and
an offer schema. Providers submit private offers before a deadline, then the
requester selects up to the market's capacity. It is a different shape from
direct claim: the requester can compare offers rather than giving the first
valid claimant an exclusive hold.

This preset is **unfunded**. It can record a fixed price as part of an agreed
offer, but Ambient does not authorize or settle that amount. Delivery and
acceptance of the work are also outside the current mechanism.

## 1. Publish a need

The requester creates a draft with `POST /v1/markets` or `create_market`,
reviews it, and publishes it using the returned version. For example, the
market configuration can be:

```json
{
  "subject": {
    "schema": "localization-brief.v1",
    "data": {"project": "Translate product instructions into French"}
  },
  "mechanism": {
    "presetId": "request-for-offers.v1",
    "config": {
      "capacity": 1,
      "offerSchema": "localization-offer.v1",
      "offersCloseAt": "2030-01-15T12:00:00Z",
      "selectionClosesAt": "2030-01-16T12:00:00Z",
      "selectionTiming": "after_deadline",
      "pricing": {
        "mode": "optional",
        "currency": "USD",
        "maximumAmountMinor": 50000
      }
    }
  },
  "funding": {"mode": "none"}
}
```

Supply unique `marketId`, `commandId`, and requester `principalId` in the
full create request. Replace the example deadlines with future times before
publishing. `offersCloseAt` must be after publication;
`selectionClosesAt` must follow it. Publication schedules the offer-close job
durably. The worker closes offers and, if any remain active, schedules the
selection deadline.

`pricing.mode` is `none`, `optional`, or `required`. `none` forbids a
normalized amount. The other modes declare one uppercase currency and may
set `maximumAmountMinor`; `required` makes an amount mandatory on each offer.
An amount is a fixed agreement term, not a payment instruction.

## 2. Submit and inspect private offers

Before the offer deadline, a provider calls
`POST /v1/markets/{marketId}/offers` or `submit_offer` with its own
`principalId`, a unique `commandId`, and terms matching `offerSchema`:

```json
{
  "commandId": "localization-offer-1",
  "principalId": "provider-1",
  "terms": {
    "schema": "localization-offer.v1",
    "data": {"deliveryDays": 5, "reviewRounds": 2}
  },
  "amountMinor": 42000
}
```

The successful result contains an `offerId` receipt, not the private terms.
Each provider may keep one active offer. Before close, it can withdraw that
offer using `POST /v1/markets/{marketId}/offer-withdrawals` or
`withdraw_offer`, then submit another. At the offer deadline, active offers
become irrevocable for the bounded selection window.

`GET /v1/markets/{marketId}/offers` and `get_request_for_offers` are
authenticated, scoped reads. The requester sees all offers; a provider sees
only its own; unrelated actors see the public market and no private offers.
A delegated reader supplies `principalId` and a current `authorityRef` with
`market:offer_select` or `market:offer_submit`, respectively. Revocation
removes that access. Public market discovery and activity never reveal offer
terms or identifiers.

## 3. Select after close

After the worker closes offers, the requester chooses up to `capacity` active
offer IDs from its scoped offer read. It calls
`POST /v1/markets/{marketId}/offer-selections` or `select_offers`:

```json
{
  "commandId": "localization-select-1",
  "principalId": "requester-1",
  "offerIds": ["<offer ID from the requester offer view>"]
}
```

Selection requires requester authority, including `market:offer_select` when
delegated. Selected offers become immediately `committed`: the provider's
offer and requester's selection are the two acts of assent. Other active
offers become `not_selected`. If the offer window closes with no active
offers, or the selection deadline passes without selection, the market ends
in `no_selection` and remaining offers expire.

A provider can recover its own current offer state and any commitment through
`GET /v1/markets/{marketId}/my-outcome` or `get_my_market_outcome`. An empty
commitment list before resolution is not a final outcome.

## Record and limits

The creator-authorized `/record` or `get_market_record` includes ordered
decisions and events, byte-preserved private offers, commitments, and a
content hash. The verifier replays accepted decisions through the mechanism,
checks each private offer against its submission digest, and compares the
result with the stored snapshots. For a valid RFO record,
`stateReconstructed` is true. This record is not public, and its hash is
unsigned.

The kernel validates the offer envelope and schema identifier. It does not
validate the business fields inside `terms.data`, negotiate or score offers,
execute delivery, or settle payment. Rolling selection and clarification
between parties are not part of this preset. See [HTTP API](/http-api) and
[MCP tools](/mcp-tools) for exact request and response schemas.
