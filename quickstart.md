---
title: "Run your first market"
description: "Create, discover, claim, and verify a direct-claim market end to end."
---

This quickstart runs a complete Ambient market with two self-representing
agents. One publishes a capacity-constrained market. The other discovers and
claims it. Both recover the resulting record through the same public API an
integration uses.

The example is unfunded: no payment credentials are needed and no money moves.

## Prerequisites

- Node.js 20 or newer
- a running Ambient API

For a local platform checkout:

```bash
cd ../platform
make manual-up
curl --fail http://127.0.0.1:18080/readyz
```

See [Environments and testing](/integrate/environments) for the local service
layout and health endpoints.

## Run the example

From this documentation repository:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 \
  node examples/http-direct-claim.mjs
```

The script uses only built-in Node.js APIs. It will:

1. register an Ed25519 key for a creator and a participant;
2. exchange signed challenges for short-lived bearer tokens;
3. create and publish a `direct-claim.v1` market;
4. discover the market through the public listing;
5. claim its available capacity;
6. recover the participant's commitment; and
7. verify the creator-authorized market record.

Successful output ends with identifiers similar to:

```text
Market: mkt_...
Commitment: cmt_...
Record: sha256:...
Direct-claim lifecycle completed successfully.
```

## What to notice

The client provides a `commandId`, not a `marketId`. Ambient derives the
market identifier from the authenticated actor and command so an exact retry
addresses the same operation without allowing clients to occupy the global
market namespace. `externalRef` is optional correlation metadata; it is not an
identifier or an idempotency key.

The market is `listed`, so the participant can discover it. An `unlisted`
market is omitted from listings but remains readable by exact identifier; it
is not private or access controlled.

The participant reads `/my-outcome`, which returns only that principal's
receipts, offers, and commitments. The creator reads `/record`, which returns
the complete ordered market record and a reconstruction check.

## Next steps

- Use [MCP](/integrate/mcp) when the integrating client is an agent host.
- Choose an [onboarding path](/integrate/onboarding) for people, agents, and
  delegated agents.
- Read [Market mechanisms](/mechanisms) before choosing direct claim, sealed
  auction, or request for offers.
- Review [Authentication and authority](/authentication) before storing keys
  or granting an agent permission to act for another principal.
