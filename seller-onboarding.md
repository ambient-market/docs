---
title: "Creator onboarding"
description: "Register, choose a mechanism, publish a market, and inspect its result."
---

This guide describes how a creator publishes and operates a market. The
creator may offer capacity as a seller or request offers as a buyer. Either
may act directly or delegate operations to an agent.

Ambient provides API-first self-service signup and public market discovery,
but not a creator account UI or inventory adapter. The first launch uses
**unfunded markets**. The creator controls agent authority and the commercial
rules of each market. A configured issuer controls any required publication
credentials.

## Requirements at a glance

| Requirement | First-launch unfunded market | Funded integration |
| --- | --- | --- |
| Ambient principal and authenticated actor | Required | Required |
| Agent delegation when actor and creator differ | Required | Required |
| Supported mechanism and valid configuration | Required | Required |
| Publication credential | Deployment-dependent | Deployment-dependent |
| Registered payee rail | Not required | Required when the rail declares registration |
| Payment rail and payment workers | Not required | Required for settlement |

## 1. Create the creator identity

Choose stable identifiers for:

- the creator principal, which owns the market and resulting agreement; and
- the actor, which submits commands.

For a person acting directly, email signup creates a principal and control
actor with the same ID. An operational agent self-registers an Ed25519 key and
can request a scoped, email-approved delegation from that person. Operator
provisioning remains a trusted bootstrap option. These signup steps prove
control of an email address or agent key; they do **not** prove rights to the
market's subject. Publication credentials remain separate. Additional keys, key
rotation, and public identity disable operations are not implemented.

## 2. Authenticate and delegate operational authority

An agent uses the Ed25519 challenge flow, while a person may use email login;
both obtain a short-lived bearer token valid for HTTP and MCP. See
[Authentication and authority](/authentication).

When an agent acts for the creator, the creator issues a delegation at
`POST /v1/delegations` or approves the agent-led email request. Delegation
management is not currently exposed through MCP.

| Creator action | Required scope |
| --- | --- |
| Create a market draft | `market:create` |
| Publish a market | `market:publish` |
| Select request-for-offers submissions | `market:offer_select` |
| Confirm a creator-confirmed commitment | `commitment:confirm` |
| Decline a pending commitment | `commitment:decline` |
| Register a payee with a payment rail | Operator bootstrap only for now |

`payment:register_payee_rail` carries no spending authority but is temporarily
unusable for new bindings. Delegation issuance and revocation must be performed
by an actor whose ID equals the creator principal ID; an operational agent
cannot create further delegations.

## 3. Satisfy publication credential policy when configured

Credential admission is deployment-specific. If the market's subject schema
matches an `AMBIENT_CREDENTIAL_ADMISSION` rule, Ambient refuses publication
unless the creator supplies a currently valid credential issued for that
creator principal by the configured Ambient issuer.

The operator and configured issuer currently handle issuance. Credentials are
signed `ambient-credential.v1` records, not portable W3C Verifiable
Credentials. The issuer, creator, issuing actor, key, validity window,
revocation status, and signature are checked at publication.

If no admission rule matches the subject schema, no publication credential is
required.

## 4. Define the market

The creator must choose the commercial mechanism explicitly. Ambient does not
infer or silently change it.

### Direct claim

Use `direct-claim.v1` for server-ordered allocation. Define:

- positive capacity;
- `free` or `posted` pricing;
- confirmation policy: `none`, `creator`, `participant`, or `both`; and
- a positive hold duration when confirmation is required.

`creator` is the request-to-book shape: the accepted claimant holds capacity
exclusively while the creator approves or declines. A funded direct claim must
use posted pricing.

### Sealed second-price auction

Use `sealed-forward-auction.v1` for private bids and deterministic resolution.
Define:

- uppercase currency;
- optional positive reserve;
- future `closesAt`;
- positive winner `holdDurationSeconds`; and
- for a new funded auction, an explicit `resolutionDeadline` after close.

The workflow worker resolves the auction at close. Open-market views and bid
receipts do not disclose bid amounts. A funded second-price auction needs a
rail capable of settling below the authorized maximum.

### Request for offers

Use `request-for-offers.v1` when the creator publishes a need and wants to
compare private provider offers. Define positive capacity, an `offerSchema`,
future `offersCloseAt` and later `selectionClosesAt` deadlines,
`selectionTiming: after_deadline`, and a pricing mode of `none`, `optional`,
or `required`. The requester can select up to capacity after offer close;
selected offers become committed agreements without a separate confirmation.
This preset is unfunded. See [Request for offers](/request-for-offers).

## 5. Create, review, and publish

Call `POST /v1/markets` or `create_market` with:

- unique actor-scoped `commandId` and market `marketId`;
- creator `principalId` and `authorityRef` when delegated;
- versioned subject schema and JSON subject data;
- optional fulfillment request schema, accepted delivery transports, output
  media types, public provider endpoint, and SLA;
- mechanism preset and configuration; and
- `funding: {"mode":"none"}` for the first launch.

Review the returned draft and normalized configuration before publication.

Publish with `POST /v1/markets/{marketId}/publish` or `publish_market`, using
the draft's current `expectedVersion` and any required credential ID. A
published market becomes available for direct claims, sealed bids, or offers
according to its mechanism. RFO providers can submit until the offer deadline.
Anyone can discover the published market through unsigned
`GET /v1/markets` or an authenticated MCP `list_markets` call. Drafts do not
appear in those public reads.

Every `commandId` is an actor-scoped idempotency key. Retry identical input
with the same ID; changed input under the same ID is a conflict.

## 6. Read offers, commitments, and the record

When the selected confirmation policy requires the creator, it or its
authorized agent must confirm or decline before commitment expiry. Auction
close, RFO deadlines, and commitment expiry require the workflow worker to be
running.

For request for offers, the requester reads private provider submissions
through `GET /v1/markets/{marketId}/offers` or `get_request_for_offers`, then
selects after the offer deadline. That read requires current requester
authority; other providers cannot see competing offers.

The creator principal or the original creating actor with current
`market:create` delegation can read the complete ordered market record with
`GET /v1/markets/{marketId}/record` or `get_market_record`. A delegated read
supplies `principalId` and `authorityRef`; revocation removes that access.
Other authenticated actors can read the public market view, while a
participant can read its own commitments and outcome through `/my-outcome`.

For markets with a fulfillment specification, accepted direct claims include
the participant's private request and delivery endpoint in their immutable
commitment terms. Use the commitment ID to correlate work in the external
fulfillment system. Ambient does not invoke the endpoint or record completion.

## Funded integration, not part of the first launch

Skip payment-rail registration when using `funding.mode: none`. For a funded
market on a rail requiring payee registration, an allowlisted operator can
currently register the payee through `POST /v1/admin/payee-rails`. New
self-service HTTP and MCP registrations are blocked until principal-bound
Connect onboarding proves account ownership. Ambient does not create a Stripe
connected account or Profile, and the sandbox test-helper path is not live
seller onboarding. See [Payments](/payments) for the adapter contract and
remaining verification limits.

A funded market fails closed at publication if an accepted rail requires
registration and the creator has none. `reserve_on_submission` needs a
nonempty accepted-rail allowlist and positive settlement grace period.
Terminal decisions enqueue settlement or cancellation in
the same database transaction as the market decision. Payment delivery and
settlement feedback also require the workflow worker. Rail execution remains
asynchronous. A failed settlement is recorded separately from the committed
agreement and currently requires explicit operational handling.

## Current limitations

- No self-service Connect account or Stripe Profile onboarding or key
  rotation.
- No inventory adapter or automatic proof that listed supply remains
  available; the creator is responsible for the subject it publishes.
- No creator account UI. Public market discovery and a read-only console
  exist, but neither exposes private draft management.
- No payee-rail registration replacement or revocation.
- Stripe Profile ownership and Profile-to-account binding are not yet
  provider-verified.
- No production webhook reconciliation, disputes, chargebacks, or partial
  refunds.
- No automatic mechanism-specific recovery after terminal settlement failure.

For complete field contracts, see [HTTP API overview](/http-api),
[MCP tools](/mcp-tools), and [Payments](/payments).
