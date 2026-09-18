---
title: "Quickstart"
description: "Run the first complete market flow over either HTTP or MCP."
---

This walkthrough creates a posted-price market for a restaurant table,
publishes it, accepts a direct claim, and inspects the resulting record. The
table makes the example concrete; the workflow is not restaurant-specific.

You need an Ambient base URL plus provisioned credentials for two actors:

- `restaurant-1`, which creates the market; and
- `diner-1`, which participates.

For HTTP, sign every request as described in
[Authentication](/authentication). For MCP, connect to `{baseURL}/mcp`
with the actor's bearer token.

## 1. Create a draft

As `restaurant-1`, send `POST /v1/markets`:

```json
{
  "commandId": "table-create-1",
  "marketId": "table-2026-09-19-1900",
  "principalId": "restaurant-1",
  "subject": {
    "schema": "restaurant-table.v1",
    "data": {
      "partySize": 2,
      "startsAt": "2026-09-19T19:00:00Z"
    }
  },
  "mechanism": {
    "presetId": "direct-claim.v1",
    "config": {
      "capacity": 1,
      "pricing": {
        "mode": "posted",
        "amountMinor": 7500,
        "currency": "USD"
      },
      "confirmation": "participant",
      "holdDurationSeconds": 600
    }
  }
}
```

The response contains a `draft` market at version `1` and a
`market.draft_created` event. Review the normalized mechanism configuration
before publication.

The equivalent MCP call is `create_market` with the same fields.

## 2. Publish the market

As `restaurant-1`, send
`POST /v1/markets/table-2026-09-19-1900/publish`:

```json
{
  "commandId": "table-publish-1",
  "expectedVersion": 1,
  "principalId": "restaurant-1"
}
```

The market becomes `open` at version `2`. The equivalent MCP tool is
`publish_market`; include the market ID in the tool input.

## 3. Claim the table

As `diner-1`, send
`POST /v1/markets/table-2026-09-19-1900/direct-claims`:

```json
{
  "commandId": "table-claim-1",
  "principalId": "diner-1"
}
```

Omitting `expectedVersion` asks Ambient to order competing claims by server
arrival. The successful result closes this one-capacity market and returns a
commitment in `awaiting_confirmations`. Save its `id`; it is required for the
next command. The equivalent MCP tool is `submit_direct_claim`.

The commitment terms contain the table subject and posted USD 75.00 price.
Ambient has recorded the terms but has not collected payment.

## 4. Confirm the commitment

As `diner-1`, send `POST /v1/commitments/{commitmentId}/confirm`:

```json
{
  "commandId": "table-confirm-1",
  "principalId": "diner-1"
}
```

The commitment becomes `committed`. If the diner instead calls `/decline`, or
does not confirm before the ten-minute hold expires, the commitment terminates
and the preset returns the table's capacity to the open market.

The MCP tools are `confirm_commitment` and `decline_commitment`.

## 5. Read the result and record

Any authenticated actor can read the current snapshot:

```text
GET /v1/markets/table-2026-09-19-1900
```

The restaurant's actor can retrieve the full ordered record:

```text
GET /v1/markets/table-2026-09-19-1900/record
```

The corresponding MCP tools are `get_market` and `get_market_record`.
The record shows the create, publish, claim, and confirmation commands; their
events; the final market and commitment snapshots; and integrity metadata.

## Sealed-auction variant

To allocate one table through a sealed second-price auction, create the market
with `sealed-forward-auction.v1` and configure `currency`, optional
`reserveAmountMinor`, `closesAt`, and `holdDurationSeconds`. After publication,
each participant submits one private bid through
`POST /v1/markets/{marketId}/sealed-bids` or `submit_sealed_bid`.

Publication schedules the close durably. At `closesAt`, the worker records
`no_trade` or selects a winner, computes the second price, and creates a
winner-confirmed commitment. Bid receipts and open-auction records do not
disclose bid amounts. Exact request shapes are in the transport references.

## Retry rule

Treat every `commandId` as an actor-scoped idempotency key. If a response is
lost, retry the identical request with the same ID. Do not reuse that ID for a
different body; Ambient returns `idempotency_conflict`.
