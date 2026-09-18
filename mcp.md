---
title: "MCP reference"
description: "Connect to Ambient through MCP and use the implemented market tools."
---

Ambient exposes a stateless Streamable HTTP MCP endpoint at `POST /mcp` using
the official Go SDK. Connect with a provisioned bearer token as described in
[Authentication](/authentication).

MCP is a transport adapter, not a separate market runtime. Its tools call the
same command and query services as HTTP and therefore share authority,
idempotency, deterministic transitions, persistence, deadlines, disclosure,
and audit behavior.

## Tool summary

| Tool | Result | Purpose |
| --- | --- | --- |
| `create_market` | `MarketResult` | Create a reviewed but unpublished market draft. |
| `publish_market` | `MarketResult` | Open a draft market. |
| `get_market` | `Market` | Read a current market snapshot. |
| `get_market_record` | `MarketRecord` | Read the creator-authorized ordered record. |
| `submit_direct_claim` | `MarketActionResult` | Claim direct-claim capacity in server order. |
| `submit_sealed_bid` | `MarketActionResult` | Submit one private auction bid and receive an amount-free receipt. |
| `confirm_commitment` | `MarketActionResult` | Confirm exact pending commitment terms. |
| `decline_commitment` | `MarketActionResult` | Decline a pending commitment and apply its preset's consequence. |

The MCP `tools/list` response provides the input schema programmatically. The
fields below are the implemented human-readable contract. Result objects are
the same application objects documented by the generated HTTP endpoint pages.
The server supplies `actorId` and `occurredAt`; tools do not accept them.

## Create a market

### `create_market`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Client-selected unique market identifier. |
| `principalId` | string | Yes | Principal creating the market. |
| `authorityRef` | string | No | Delegation identifier when the authenticated actor represents another principal. |
| `subject.schema` | string | Yes | Versioned client-defined subject schema identifier. |
| `subject.data` | object | Yes | Data describing the item, service, capacity, or right being allocated. |
| `mechanism.presetId` | string | Yes | `direct-claim.v1` or `sealed-forward-auction.v1`. |
| `mechanism.config` | object | Yes | Configuration required by the selected preset. |

`direct-claim.v1` configuration:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `capacity` | integer | Yes | Positive allocation capacity. |
| `pricing.mode` | string | Yes | `free` or `posted`. |
| `pricing.amountMinor` | integer | For `posted` | Positive amount in minor currency units. |
| `pricing.currency` | string | For `posted` | Three-letter uppercase currency. |
| `confirmation` | string | Yes | `none`, `creator`, `participant`, or `both`. |
| `holdDurationSeconds` | integer | When confirmation is required | Positive confirmation period. Omit or send `0` when confirmation is `none`. |

`sealed-forward-auction.v1` configuration:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | string | Yes | Three-letter uppercase currency. |
| `reserveAmountMinor` | integer | No | Positive reserve in minor currency units. |
| `closesAt` | RFC 3339 timestamp | Yes | Fixed close that must still be in the future at publication. |
| `holdDurationSeconds` | integer | Yes | Positive winner confirmation period. |

Returns `MarketResult`. See [Create a market draft](/api-reference/markets/create-a-market-draft)
for complete examples and response fields.

### `publish_market`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Draft market to publish. |
| `expectedVersion` | integer | Yes | Current draft version returned by Ambient. |
| `principalId` | string | Yes | Creator principal authorizing publication. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |

Returns `MarketResult`. See [Publish a market draft](/api-reference/markets/publish-a-market-draft).

## Read a market

Both read tools take one required string field, `marketId`.

- `get_market` returns `Market`. See [Get a market](/api-reference/markets/get-a-market).
- `get_market_record` returns `MarketRecord` and is restricted to the creator
  principal or creating actor. See [Get a market record](/api-reference/records/get-a-market-record).

## Participate

### `submit_direct_claim`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Open `direct-claim.v1` market. |
| `expectedVersion` | integer | No | Optimistic version check. Omit or send `0` for server arrival order. |
| `principalId` | string | Yes | Principal making the claim. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |

Returns `MarketActionResult`. See [Submit a direct claim](/api-reference/participation/submit-a-direct-claim).

### `submit_sealed_bid`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Open `sealed-forward-auction.v1` market. |
| `principalId` | string | Yes | Principal submitting the bid. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |
| `amountMinor` | integer | Yes | Positive private bid in minor currency units. |
| `currency` | string | Yes | Auction's three-letter uppercase currency. |

Returns `MarketActionResult` with an amount-free `bidReceipts` entry. See
[Submit a sealed bid](/api-reference/participation/submit-a-sealed-bid).

## Act on a commitment

`confirm_commitment` and `decline_commitment` have the same input shape:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `commitmentId` | string | Yes | Pending commitment returned by an allocation action. |
| `principalId` | string | Yes | Principal confirming or declining. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |

Both return `MarketActionResult`. See [Confirm a commitment](/api-reference/commitments/confirm-a-commitment)
and [Decline a commitment](/api-reference/commitments/decline-a-commitment).

## Command identity

State-changing tools take `commandId` and `principalId`. Include
`authorityRef` when the bearer-authenticated actor represents another
principal. Market IDs are explicit tool inputs rather than URL path values.

The same actor-scoped idempotency rule applies as over HTTP: retry the exact
input with the same command ID, and never reuse that ID for different input.

## Results and errors

Successful calls return the application contract directly: `MarketResult`,
`MarketActionResult`, a `Market`, or a `MarketRecord`, depending on the tool.

A failed tool call sets `isError` and returns:

```json
{
  "error": {
    "code": "invalid_market_transition",
    "message": "..."
  }
}
```

Codes match the HTTP application's stable classifications. Internal errors are
not exposed.

For sealed bids, successful structured output contains an amount-free receipt
and never includes the private bid object. While the auction is open, the
creator's record redacts the submitted request amount as well.

## Deliberate omissions

The current MCP endpoint has no resources, prompts, elicitation, embedded UI,
subscriptions, or transport-specific market behavior. Auction close and
commitment expiry are system commands delivered by the durable worker, not
participant-callable MCP tools.
