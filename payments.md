---
title: "Payments"
description: "Where funded markets are headed and what is available for the first launch."
---

Payments integration is underway. The first launch supports **unfunded
markets**, so creators and participants can use Ambient without payment
onboarding. A market may still include a posted price, bid, or offer amount as
part of its terms, but Ambient does not move that money in the launch flow.

## What is being built

Funded markets will connect the market decision to a separate payment
lifecycle:

```text
authorize -> settle
          -> cancel
settle    -> refund
```

- **Authorize** reserves enough value before a claim or bid is accepted.
- **Settle** moves the final amount after the commitment is confirmed.
- **Cancel** releases an unused authorization for a losing bid or abandoned
  commitment.
- **Refund** reverses a settled payment without rewriting the market outcome.

Keeping payment separate from the market lifecycle matters. A commitment can
record an agreement even when payment delivery is still pending, and a payment
failure does not silently change who won or reopen capacity.

## Agent authority

An agent will not receive open-ended spending authority. Funded participation
uses a `payment:authorize` delegation with an explicit mandate that can limit:

- payment rail;
- currency;
- maximum amount per authorization;
- payee;
- market; and
- expiry.

Ambient rechecks those bounds when it accepts the authorization and binds an
accepted authorization to one claim or bid.

## Current progress

The rail-neutral authorization, settlement, cancellation, refund, and
recording model is implemented. A first Stripe Connect adapter has been tested
against Stripe's sandbox. The remaining work for a production payment launch
includes:

- principal-bound creator onboarding;
- participant-facing payment setup;
- provider callbacks and reconciliation;
- production operations and recovery policy; and
- a live end-to-end pilot with real accounts.

Stripe is the first adapter, not part of the market mechanism itself. Ambient
is designed so additional card, bank, escrow, or asset rails can implement the
same payment lifecycle without changing market rules.

## What to use now

For the first launch, create markets with:

```json
{"funding": {"mode": "none"}}
```

Treat any monetary amount as an agreement term and handle payment outside
Ambient. Do not build against the funded endpoints for production use yet.

The existing payment endpoints remain documented in the generated reference
for integration partners working directly with Ambient. Public onboarding for
funded markets is upcoming.
