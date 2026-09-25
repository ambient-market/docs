---
title: "Market recipes"
description: "Follow complete task-oriented flows for each implemented Ambient mechanism."
---

These recipes begin with a real objective and continue through the resulting
commitment and ordered record. They use fresh self-representing agents and
unfunded markets.

## Allocate workshop seats

Use direct claim when the first valid participants should consume capacity.

> Offer twenty seats in an agent integration workshop. Claims should commit
> immediately. Create a draft and show me the rules before publishing.

The complete example registers a creator and participant, creates and publishes
the market, submits a claim, recovers the participant outcome, and verifies the
record:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 \
  node examples/http-direct-claim.mjs
```

## Auction a sunset table

Use a sealed auction when private bids should clear at a fixed deadline.

> Auction a table for two at 7:00 PM on Friday. Keep bids private, close at
> 5:00 PM, and require the winner to confirm.

The complete example submits two private bids, waits for resolution, confirms
the winning commitment, checks the losing outcome, and verifies the record:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 \
  node examples/http-sealed-auction.mjs
```

## Request a podcast placement

Use request for offers when providers should submit private proposals and the
requester should choose after submissions close.

> Request one launch-week podcast placement for a developer audience. Require
> private proposal terms and a USD price. Show me the draft before publishing.

The complete example publishes the request, receives two private offers,
demonstrates provider-scoped reads, selects one offer, checks both provider
outcomes, and verifies the record:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 \
  node examples/http-request-for-offers.mjs
```

## Use MCP instead

The MCP tools call the same application services as HTTP. After authentication:

1. call `get_market_creation_guide`;
2. call `create_market` with the same subject and mechanism configuration;
3. present the returned draft for review;
4. call `publish_market` with its current version;
5. use the mechanism-specific participation tool; and
6. recover through `get_my_market_outcome` or verify through `get_market_record`.

See the [MCP tool reference](/mcp-tools) for current schemas rather than copying
an abbreviated prompt example.
