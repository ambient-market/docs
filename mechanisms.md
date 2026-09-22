---
title: "Market mechanisms"
description: "Choose how participants act and how Ambient determines the outcome."
---

A mechanism is the versioned rule set that turns participant actions into an
outcome. The creator chooses it explicitly before publishing.

## Choose a mechanism

| If you need to... | Use |
| --- | --- |
| Allocate capacity to the first valid participants | [Direct claim](/direct-claim) |
| Collect private bids and resolve them at a deadline | [Sealed auction](/sealed-auction) |
| Publish a need and compare private provider proposals | [Request for offers](/request-for-offers) |

The mechanism is separate from the subject. An event registration, freight
slot, appointment, API quota, or service request can use whichever rule set
fits the commercial decision.

## Shared lifecycle

Every market begins as a draft. The creator reviews the subject and mechanism
configuration, then publishes the current version. Publication makes the
market discoverable and enables the mechanism's participant actions.

Each mechanism owns its own open and resolved states, but all of them produce
the same commitment contract. A market outcome may commit immediately or
create a temporary commitment that waits for confirmation.

## Shared guarantees

All three mechanisms use the same:

- principal and delegated-agent authority checks;
- actor-scoped command idempotency;
- authoritative server ordering;
- durable deadline delivery;
- public and private disclosure boundaries; and
- ordered market record.

For the first launch, create markets with `funding.mode: none`. See
[Payments](/payments) for the funded-market direction.
