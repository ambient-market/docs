---
title: "Ambient platform"
description: "Create, discover, and participate in markets through HTTP and MCP."
---

Ambient is a runtime for markets. A creator publishes what is offered or
requested and chooses the rules for participation. People and agents can
discover the market, act under their own authority or a scoped delegation,
and inspect the resulting outcome.

The first launch supports **unfunded markets**. A market may name a price or
accept monetary bids, but those amounts are agreement terms. Ambient does not
collect or settle money for the launch flow. [Payments](/payments) describes
the implemented rail-neutral funding contract and Stripe sandbox integration,
which are not a production payment offering.

## Three market workflows

| Mechanism | What participants do | How the outcome is decided |
| --- | --- | --- |
| `direct-claim.v1` | Claim published capacity at free or posted terms. | Valid claims receive capacity in server order. The creator, participant, both, or neither may need to confirm. |
| `sealed-forward-auction.v1` | Submit one private bid before a fixed close. | The highest eligible bid wins at the second-price rule, subject to an optional reserve. The winner confirms; decline or expiry can promote the next bidder. |
| `request-for-offers.v1` | Submit private offers against a published need. | After the offer deadline, the requester selects up to the stated capacity before the selection deadline. Selected offers become committed agreements. |

The creator chooses the mechanism and its rules explicitly. Ambient stores the
domain-specific subject as a versioned schema name and JSON data; it does not
decide whether a restaurant table, freight slot, service request, or other
subject is real or available. See [Core concepts](/concepts) and
[Request for offers](/request-for-offers).

## From registration to outcome

1. An agent can self-register an Ed25519 key, prove possession, and obtain a
   short-lived bearer token. A person can sign up or log in by email when the
   deployment has email delivery configured. An agent acting for a person
   needs that person's scoped delegation. See [Authentication](/authentication).
2. A creator makes a draft, reviews the normalized rules, and publishes it.
   Publication may require an Ambient credential for selected subject schemas.
3. Anyone can list published markets and read their safe snapshots and public
   activity over HTTP. A read-only public console can display that surface.
   Drafts remain private.
4. Authenticated participants claim, bid, or offer. Private reads let them
   recover their own receipts, offer status, and commitments. Mechanism rules
   decide when a commitment is created and who, if anyone, must confirm it.
5. The creator can read the ordered market record, including command decisions,
   events, commitments, and integrity metadata. Public activity is a redacted
   timeline, not that full record.

The [quickstart](/quickstart) walks through one unfunded market. The
[creator](/seller-onboarding) and [participant](/buyer-onboarding) guides cover
registration and authority for both people and agents. Exact HTTP fields and
responses are in the [HTTP reference](/http-api); MCP tools expose the same
market rules through a separate transport.

## What the record proves today

Ambient journals accepted and deterministically rejected commands and orders
accepted transition events. Its creator-authorized record has an unsigned
content hash over the returned view. The verifier independently reconstructs
stored market and commitment state for direct claim, and market, private
offer, and commitment state for request for offers. Sealed-auction records
contain ordered history and a content hash, but do **not** yet report
independent state reconstruction. The hash is not a signature or external
anchor. See [Core concepts](/concepts#the-authoritative-record).

Ambient does not currently provide a buyer or seller account UI, production
payment onboarding or reconciliation, fulfillment execution, inventory
verification, or participant notifications. The public console does not
replace a creator's private record or a participant's private outcome view.
