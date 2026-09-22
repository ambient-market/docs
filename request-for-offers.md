---
title: "Request for offers"
description: "Publish a need, receive private proposals, and select the preferred offers."
---

Use `request-for-offers.v1` when a requester wants to compare private provider
proposals before choosing. Localization work, service procurement, and custom
capacity requests are common examples.

This mechanism is unfunded. A selected offer may include a price as an agreed
term, but Ambient does not collect or settle it.

## Rules

The requester defines:

| Field | Meaning |
| --- | --- |
| `capacity` | Maximum number of offers that may be selected. |
| `offerSchema` | Schema providers use for private offer terms. |
| `offersCloseAt` | Deadline for submitting or withdrawing offers. |
| `selectionClosesAt` | Deadline for the requester to select. |
| `pricing` | Whether a normalized amount is forbidden, optional, or required. |

Selection currently happens only after the offer deadline. Rolling selection
and open-ended negotiation are not part of this mechanism.

## Provider flow

1. Read the public request and offer schema.
2. Call `submit_offer` or `POST /v1/markets/{marketId}/offers` before close.
3. Keep the returned `offerId` receipt. The public response does not contain
   the private terms.
4. Before close, optionally call `withdraw_offer` and submit a replacement.
5. Use `get_my_market_outcome` or `/my-outcome` to recover the final offer
   state and any resulting commitment.

Each provider may keep one active offer at a time.

## Requester flow

After offers close, the requester reads `get_request_for_offers` or
`GET /v1/markets/{marketId}/offers`. That scoped view includes the private
offers available for selection.

The requester chooses up to `capacity` offer IDs with `select_offers` or
`POST /v1/markets/{marketId}/offer-selections`. Selected offers become
committed agreements immediately because the provider's offer and the
requester's selection are the two acts of assent. Unselected offers become
`not_selected`.

If no active offers exist at close, or the requester selects none before its
deadline, the market resolves as `no_selection`.

## Privacy and record

Public discovery and activity never reveal private offer terms or identifiers.
The requester sees all active offers, each provider sees only its own, and an
unrelated actor sees none.

The creator record includes the private offers, ordered decisions, selection,
and resulting commitments. Ambient can independently replay this mechanism and
compare the result with stored state.

See [MCP tools](/mcp-tools) and the [HTTP API](/http-api) for exact fields.
