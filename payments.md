---
title: "Payments"
description: "Current payment support, work in progress, and upcoming funded-market capabilities."
---

Ambient is designed to connect market outcomes to multiple payment rails. The
market decides who receives an allocation and on what terms. The payment layer
authorizes funds, settles the committed amount, releases unused funds, and
records the result.

## Available now

The first launch supports **unfunded markets** across all three mechanisms:

- direct claim;
- sealed auction; and
- request for offers.

These markets may include a posted price, bid, or offer amount as an agreement
term. Ambient does not move that money in the launch flow. Creators and
participants do not need payment onboarding to use the platform.

The platform already contains the shared payment foundation: authorization,
settlement, cancellation, refunds, bounded agent mandates, and recorded payment
outcomes. This foundation is not yet offered as a production payment service.

## In progress

The first production payment integration is focused on funded direct claims
and sealed auctions.

### Funded direct claim

A participant authorizes the posted amount before claiming. Ambient binds that
authorization to one accepted claim, settles it when the commitment becomes
final, and releases it when the commitment is declined or expires.

### Funded sealed auction

A bidder authorizes up to its bid before participating. Ambient settles the
confirmed winner at the clearing price, which may be lower than the authorized
maximum, and releases losing authorizations. If a winner declines or expires,
the next eligible bidder can be promoted while its authorization remains
valid.

### First production rail

Stripe Connect is the first adapter under development. The rail-neutral
payment contract and initial Stripe integration are implemented. Work still in
progress includes:

- principal-bound creator onboarding;
- participant-facing payment setup;
- provider callbacks and reconciliation;
- production operations and recovery policy; and
- a live end-to-end pilot with real accounts.

## Upcoming

### Funded request for offers

Request-for-offers markets will also support payments. This flow reverses the
usual direction of a direct claim or forward auction: the requester creates
the market and pays one or more selected providers.

The funded RFO design will need to bind the requester's authorized budget to
the selected offers, settle each selected provider under the recorded terms,
and release funds that are not used. Until that lifecycle is implemented, RFO
prices remain agreement terms only.

### Additional payment rails

Stripe is the first rail, not a permanent dependency of the market runtime.
Additional payment rails will implement the same authorization, settlement,
cancellation, refund, and recording contract. Market mechanisms should not
need provider-specific rules.

## Agent payment authority

Agents will not receive open-ended spending authority. Funded participation
uses a `payment:authorize` delegation with a mandate that can limit:

- payment rail;
- currency;
- maximum amount per authorization;
- payee;
- market; and
- expiry.

Ambient rechecks those bounds when it accepts the authorization and binds an
accepted authorization to one market action.

## What to use for the first launch

Create markets with:

```json
{"funding": {"mode": "none"}}
```

Treat monetary amounts as agreement terms and handle payment outside Ambient.
The existing funded endpoints remain documented in the generated reference
for integration partners working directly with Ambient, but they are not yet
the public production path.
