---
title: "Sealed auction"
description: "Collect private bids and resolve a second-price auction at a fixed deadline."
---

Use `sealed-forward-auction.v1` when one indivisible opportunity should be
allocated from private bids. A freight slot or time-sensitive capacity right
is a typical example.

## Rules

The creator defines:

| Field | Meaning |
| --- | --- |
| `currency` | Currency shared by all bids. |
| `reserveAmountMinor` | Optional minimum acceptable outcome. |
| `closesAt` | Fixed bidding deadline. |
| `holdDurationSeconds` | Time the provisional winner has to confirm. |

Each principal may submit one private bid before close. Ambient ranks eligible
bids by amount and breaks ties with authoritative command order.

## Resolution

The highest eligible bidder wins. The clearing price is the greater of the
reserve and the second-highest eligible bid. A sole eligible bidder pays the
reserve, or zero when there is no reserve. If no bid clears the reserve, the
market resolves as `no_trade`.

The winner receives a provisional commitment and must confirm before the hold
expires. If it declines or expires, Ambient excludes that bid, promotes the
next eligible bidder, recomputes the second price, and opens a new confirmation
hold. Promotion continues until a bidder confirms or the market reaches
`no_trade`.

## Participant flow

1. Read the public rules and deadline.
2. Call `submit_sealed_bid` or
   `POST /v1/markets/{marketId}/sealed-bids` once before close.
3. Keep the amount-free receipt returned by Ambient.
4. After close, use `get_my_market_outcome` or `/my-outcome` to discover
   whether a commitment is awaiting confirmation.
5. Confirm or decline before the stated expiry.

## Privacy and record

While bidding is open, public state shows the bid count but not bid amounts or
identities. Receipts omit the amount. The creator record also redacts open bid
amounts.

The creator record contains the complete ordered auction history and a content
hash. Independent replay verification of the stored auction state is upcoming;
the record reports that distinction explicitly.

See [MCP tools](/mcp-tools#submit_sealed_bid) and the
[HTTP API](/http-api) for exact fields.
