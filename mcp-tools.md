---
title: "MCP tools"
description: "Connect to Ambient through MCP and use the implemented market tools."
---

Ambient exposes a stateless Streamable HTTP MCP endpoint at `POST /mcp` using
the official Go SDK. Connect with a short-lived bearer token obtained through
Ed25519 actor proof or configured human email login, or use a bootstrap static
token in a controlled deployment, as described in [Authentication](/authentication).
The first launch supports unfunded markets across all three presets. Payment
tools describe an implemented integration path, not a live payment offering.

MCP is a transport adapter, not a separate market runtime. Its tools call the
same command and query services as HTTP and therefore share authority,
idempotency, deterministic transitions, persistence, deadlines, disclosure,
and audit behavior.

## Tool summary

| Tool | Result | Purpose |
| --- | --- | --- |
| `get_actor_context` | `{actorId}` | Read the identity established by the authenticated connection. |
| `get_market_creation_guide` | `MarketCreationGuide` | Read the authenticated actor ID, supported preset rules, and draft-to-publication sequence. |
| `create_market` | `MarketResult` | Create a reviewed but unpublished market draft. |
| `publish_market` | `MarketResult` | Open a draft market. |
| `cancel_market` | `MarketResult` | Cancel an open, unfunded market before any participation is accepted. |
| `list_markets` | `MarketListPage` | Discover published markets and their mechanics without a known market ID. |
| `get_market` | `PublicMarket` | Read the published public snapshot; private auction state is withheld. |
| `get_market_record` | `MarketRecord` | Read the creator-authorized ordered record. |
| `get_my_market_outcome` | `ParticipantMarketOutcome` | Read your own bid receipts, offer states, and commitments for a market. |
| `get_request_for_offers` | `RequestForOffersView` | Read public RFO state plus offers scoped to the requester or submitting provider. |
| `authorize_payment` | `PaymentOperation` | Queue a bounded payment authorization for funded participation. |
| `get_payment_operation` | `PaymentOperationView` | Poll a payment operation queued by the authenticated actor. |
| `register_payee_rail` | `PayeeRailRegistrationView` | Currently rejects new bindings pending verified Connect onboarding; operator bootstrap remains available over HTTP. |
| `submit_direct_claim` | `MarketActionResult` | Claim direct-claim capacity in server order. |
| `submit_sealed_bid` | `MarketActionResult` | Submit one private auction bid and receive an amount-free receipt. |
| `submit_offer` | `MarketActionResult` | Submit a private RFO offer and receive a receipt. |
| `withdraw_offer` | `MarketActionResult` | Withdraw your own active RFO offer before close. |
| `select_offers` | `MarketActionResult` | Select offers as the requester after the offer deadline. |
| `confirm_commitment` | `MarketActionResult` | Confirm exact pending commitment terms. |
| `decline_commitment` | `MarketActionResult` | Decline a pending commitment and apply its preset's consequence. |
| `refund_commitment` | `MarketActionResult` | Queue a creator-authorized full refund of a settled commitment. |

For `request-for-offers.v1`, `submit_offer` takes private `terms` matching the
market's `offerSchema` and optional `amountMinor` under its pricing rule.
`get_request_for_offers` requires authentication and current authority: the
requester sees all offers, each provider sees only its own, and unrelated
actors see an empty offer list. Delegated reads provide `principalId` and
`authorityRef`; self-reads may omit both. Revoked grants cannot read private
offers.
`withdraw_offer` requires an own active `offerId` before close; `select_offers`
requires requester authority and `offerIds` after close.

The MCP `tools/list` response provides the input schema programmatically. The
fields below are the implemented human-readable contract. Result objects are
the same application objects documented by the generated HTTP endpoint pages.
The server supplies `actorId` and `occurredAt`; tools do not accept them.

For a principal's plain-language request to offer something, call
`get_market_creation_guide` before `create_market`. The guide is read-only and
returns the authenticated `actorId`, self/delegated principal rule, subject
guidance, supported mechanism presets with valid example configurations,
funding and optional handoff rules, and the draft→publish sequence. Agents
should derive the actual offer, price, capacity, and deadlines from the
principal's intent, not copy example business terms. For self-action, use the
returned `actorId` as `principalId`; a different principal requires an existing
delegation reference.

## Authorize payment

### `authorize_payment`

For funded participation, first create or discover the market and use its
canonical `marketId` in this call. The payment authorization must be queued
before submitting the funded claim or bid.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `authorizationId` | string | Yes | Client-selected payment authorization identifier. |
| `railId` | string | Yes | Configured rail that will reserve the funds. |
| `principalId` | string | Yes | Payer principal represented by the authenticated actor. |
| `authorityRef` | string | When delegated | Delegation with `payment:authorize` and a matching payment mandate. |
| `payeePrincipalId` | string | Yes | Principal that may receive settlement. |
| `marketId` | string | Yes | Market the authorization may fund. |
| `amountMinor` | integer | Yes | Positive maximum in minor currency units. |
| `currency` | string | Yes | Three-letter uppercase currency. |
| `expiresAt` | RFC 3339 timestamp | Yes | Authorization horizon, no later than a delegated mandate's expiry. |
| `paymentCredential` | string | Rail-dependent | Private one-time rail credential. Stripe expects a seller-scoped Link Shared Payment Token. |

The tool returns a `PaymentOperation` with `pending` status. Delivery through
the configured rail is asynchronous. The opt-in fake rail moves no money. A mandate's
`maxAmountMinor` limits each authorization, not aggregate spending across
multiple commands. Delegated authority and mandate bounds are locked and
revalidated atomically with queueing; an exact accepted retry remains replayable
after later revocation. A delegation may have only one pending, leased, or
unexpired authorized hold at a time.
Private credentials are encrypted into delivery-only storage, decrypted only
by the payment worker, and deleted on terminal success or failure. They are not
part of MCP results, the command journal, status views, or market records.

## Register a payee rail

### `register_payee_rail`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `principalId` | string | Yes | Payee principal represented by the authenticated actor. |
| `authorityRef` | string | When delegated | Delegation with `payment:register_payee_rail`. |
| `railId` | string | Yes | Configured rail to register. |
| `credentialTarget` | string | Yes | Public target participants use when obtaining the rail credential. |
| `privateReference` | string | Yes | Confidential adapter address retained by Ambient. |

The result omits `privateReference`. Stripe verifies that its private connected
account exists under the platform and can accept charges, but that does not
establish that the payee owns it. New self-service registrations return
`payee_rail_onboarding_required` until principal-bound Connect onboarding is
available. An allowlisted operator can register a payee through HTTP meanwhile.

### `get_payment_operation`

Takes one required `commandId`. The ID is scoped to the authenticated actor;
another actor cannot distinguish the operation from a missing one. The returned
`PaymentOperationView` provides status, verified authorization state when the
operation succeeded, stable rejection code, rail ID, and timestamps. It omits
provider error text, rail references, raw requests/results, lease state, and
journal entries.

## Create a market

### `create_market`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `externalRef` | string | No | Creator-private correlation reference for another system; nonunique and not an idempotency key. |
| `discoverability` | string | No | `listed` by default, or `unlisted` to omit the market from discovery while retaining exact-ID access. Unlisted is not private. |
| `principalId` | string | Yes | Principal creating the market. |
| `authorityRef` | string | No | Delegation identifier when the authenticated actor represents another principal. |
| `subject.schema` | string | Yes | Versioned client-defined subject schema identifier. |
| `subject.data` | object | Yes | Data describing the item, service, capacity, or right being allocated. |
| `fulfillment.requestSchema` | string | No | Versioned schema a claimant must use for its private request. |
| `fulfillment.acceptedDeliveryTransports` | string[] | With fulfillment | Nonempty list of supported delivery transports. |
| `fulfillment.providerEndpoint` | object | No | Optional public `{transport, uri}` coordination endpoint. Never include credentials. |
| `fulfillment.outputMediaTypes` | string[] | With fulfillment | Nonempty list of output media types. |
| `fulfillment.slaSeconds` | integer | No | Optional fulfillment target in seconds. |
| `mechanism.presetId` | string | Yes | `direct-claim.v1`, `sealed-forward-auction.v1`, or `request-for-offers.v1`. |
| `mechanism.config` | object | Yes | Configuration required by the selected preset. |
| `funding.mode` | string | No | `none` or `reserve_on_submission`. Defaults to `none`; use `none` for the first launch. |
| `funding.acceptedRailIds` | string[] | For funded markets | Nonempty allowlist of configured rails. |
| `funding.settlementGraceSeconds` | integer | For funded markets | Positive settlement delivery window. |

Ambient assigns the canonical `marketId` and returns it with the draft. Use
that returned identifier for publication and every later market operation.

`direct-claim.v1` configuration:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `capacity` | integer | Yes | Positive allocation capacity. |
| `pricing.mode` | string | Yes | `free` or `posted`. |
| `pricing.amountMinor` | integer | For `posted` | Positive amount in minor currency units. |
| `pricing.currency` | string | For `posted` | Three-letter uppercase currency. |
| `confirmation` | string | Yes | `none` commits the first valid claim immediately. `creator` gives it an exclusive hold pending creator acceptance (request to book). `participant` and `both` are also accepted commitment policies. |
| `holdDurationSeconds` | integer | When confirmation is required | Positive confirmation period. Omit or send `0` when confirmation is `none`. |

`sealed-forward-auction.v1` configuration:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `currency` | string | Yes | Three-letter uppercase currency. |
| `reserveAmountMinor` | integer | No | Positive reserve in minor currency units. |
| `closesAt` | RFC 3339 timestamp | Yes | Fixed close that must still be in the future at publication. |
| `holdDurationSeconds` | integer | Yes | Positive winner confirmation period. |
| `resolutionDeadline` | RFC 3339 timestamp | For funded auctions | Final promotion and resolution horizon after `closesAt`; funding must remain valid through this time plus settlement grace. |

For `request-for-offers.v1`, see [Request for offers](/request-for-offers) for
its deadline, offer schema, selection, pricing, and confirmation fields. This
preset supports unfunded markets only.

Returns `MarketResult`. See [Create a market draft](/api-reference/markets/create-a-market-draft)
for complete examples and response fields.

### `publish_market`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Draft market to publish. |
| `expectedVersion` | integer | Yes | Current draft version returned by Ambient. |
| `credentialId` | string | When configured | Active credential required when a deployment admission rule matches the subject schema. |
| `principalId` | string | Yes | Creator principal authorizing publication. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |

Returns `MarketResult`. See [Publish a market draft](/api-reference/markets/publish-a-market-draft).

### `cancel_market`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Open market to cancel. |
| `expectedVersion` | integer | Yes | Current market version. |
| `principalId` | string | Yes | Creator principal authorizing cancellation. |
| `authorityRef` | string | No | Delegation with `market:cancel` scope when actor and principal differ. |

Cancellation is deliberately narrow in v0: the market must be unfunded and
must have no accepted claim, bid, or offer. It remains publicly readable as a
terminal audit record, and any scheduled auction or RFO close is canceled.

## Read a market

These read tools take one required string field, `marketId`. Private reads also
accept optional `principalId` and `authorityRef` for current delegated
authority; omit both for self-representation.

- `get_market` returns `PublicMarket`. See [Get a published market](/api-reference/markets/get-a-published-market).
- `get_market_record` returns `MarketRecord` to the creator principal or the
  original creating actor with current `market:create` authority. See
  [Get a market record](/api-reference/records/get-a-market-record).
- `get_my_market_outcome` returns the public market snapshot plus only the
  represented principal's accepted bid receipts, current offer states, and
  commitments. Offer terms remain in `get_request_for_offers`. A
  winner can use its commitment ID to confirm; an empty commitment list is not
  necessarily a final loss while promotion remains possible. Current claim,
  bid, or offer-submission authority is required for the market's mechanism.
  The HTTP equivalent is `GET /v1/markets/{marketId}/my-outcome`.

## Participate

### `submit_direct_claim`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `marketId` | string | Yes | Open `direct-claim.v1` market. |
| `expectedVersion` | integer | No | Optimistic version check. Omit or send `0` for server arrival order. |
| `principalId` | string | Yes | Principal making the claim. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |
| `paymentAuthorizationId` | string | For funded markets | Authorization reserved for this exact claim. |
| `fulfillment.request` | object | With fulfillment | Private `{schema, data}` request matching the market's `requestSchema`. |
| `fulfillment.deliveryEndpoint` | object | With fulfillment | Private `{transport, uri}` destination using an accepted transport. |

The public market exposes only its fulfillment specification. The claim
handoff is retained in the commitment terms and creator-authorized audit
record; public market activity exposes allocation counts but not the request or
delivery URI. Ambient records the handoff and correlation commitment ID but
does not invoke endpoints or deliver the result.

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
| `paymentAuthorizationId` | string | For funded markets | Authorization covering the maximum bid and required lifecycle horizon. |

Returns `MarketActionResult` with an amount-free `bidReceipts` entry. See
[Submit a sealed bid](/api-reference/participation/submit-a-sealed-bid).

## Act on a commitment

`confirm_commitment`, `decline_commitment`, and `refund_commitment` have the same input shape:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commandId` | string | Yes | Actor-scoped idempotency key. |
| `commitmentId` | string | Yes | Pending commitment returned by an allocation action. |
| `principalId` | string | Yes | Principal confirming or declining. |
| `authorityRef` | string | No | Delegation identifier when actor and principal differ. |

Both return `MarketActionResult`. See [Confirm a commitment](/api-reference/commitments/confirm-a-commitment)
and [Decline a commitment](/api-reference/commitments/decline-a-commitment).

`refund_commitment` requires the creator principal or an agent holding
`commitment:refund`. It queues a full refund through the rail and returns the
commitment with refund state `pending`. Terminal rail feedback changes that
dimension to `refunded` or `failed`; the commercial agreement remains
`committed` and capacity is not reopened. After a terminal failure, callers may
retry with a new command ID; Ambient records the retry as a new payment
operation without erasing the failed attempt.

## Command identity

State-changing tools take `commandId` and `principalId`. Include
`authorityRef` when the bearer-authenticated actor represents another
principal. Market IDs are explicit tool inputs rather than URL path values.

The same actor-scoped idempotency rule applies as over HTTP: retry the exact
input with the same command ID, and never reuse that ID for different input.

## Results and errors

Successful calls return the application contract directly, such as
`MarketResult`, `MarketActionResult`, `PublicMarket`, `MarketRecord`, or the
tool-specific participant and payment views.

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
