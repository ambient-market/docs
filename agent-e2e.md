---
title: "Unbriefed-agent end-to-end tests"
description: "Black-box agent scenarios and the boundary between allocation, payment, and fulfillment."
---

These tests ask whether an agent can participate using only a principal's goal,
its authenticated Ambient connection, and the capabilities the running system
advertises. They complement the deterministic lifecycle tests; they do not
replace them.

## No-cheat boundary

The participant receives real business facts (such as a table's date or a
buyer's maximum bid) and an authenticated connection. It obtains its actor ID
from `get_actor_context`, or from the market-creation guide when acting as a
seller, rather than from the test prompt. It discovers MCP tools and market
rules from the live endpoint. A buyer discovers listings through
`list_markets`. The controller does **not** put preset IDs, tool names, market
IDs, command shapes, hidden fixture data, or expected answers in the agent's
prompt. It may inspect private records afterward to assert what happened, but
those records never become participant context. It can create unrelated
listings as world-state fixtures; the direct-claim buyer currently faces one
such decoy, and receives neither listing ID in its prompt.

The model-backed scenarios are opt-in because they consume model calls and can
expose real model variability. Run it against the isolated deployed stack:

```sh
export OPENROUTER_API_KEY=... # use a test key; do not commit it
export OPENROUTER_MODEL=...   # a model with tool calling
AMBIENT_E2E_TEST_PACKAGE=./test/e2e/agent sh scripts/run-deployed-e2e.sh
```

The table scenario has a restaurant agent publish a free, first-come table for
two, then an unrelated diner agent discover and reserve it. The RFO scenario
has a requester publish a priced need, two independent providers submit
private offers, and a fresh requester agent inspect and select one after the
worker closes submissions. The auction scenario exercises seller publication,
two private bids, worker resolution, then gives a fresh winner agent the goal
of confirming. The winner must discover its own commitment ID through
`get_my_market_outcome`; the controller never supplies it. The controller
checks public rules and private
decision records. Tool sequences are logged so a failure shows whether the gap
is discovery, tool use, authority, mechanism selection, or transition behavior.

## Scenario progression

| Scenario | Agent decisions to exercise | Current completion boundary |
| --- | --- | --- |
| Direct claim: restaurant table | Seller chooses and publishes the right mechanism; diner finds and claims the matching table. | A committed allocation, **not** proof the diner arrived or was seated. |
| Sealed auction: scarce table | Seller chooses auction terms; independent bidders discover and submit within their own limits; worker resolves second price; winner discovers and confirms its commitment. | Confirmed allocation, **not** funded settlement or arrival redemption. The model-backed run remains opt-in. |
| Request for offers: service request | Requester publishes need; providers discover and submit private offers; requester reviews and selects. | Selected commitment; doing, delivering, and accepting the work are outside this mechanism today. |

For each scenario, assertions should distinguish: published listing,
participation, market resolution, commitment, payment outcome (if any), and
fulfillment outcome. A market may be closed while the exchange remains
unfinished. Neither a committed table nor a settled charge proves that the
right person claimed the table at the door. That would require a scoped
redemption/check-in fact from the restaurant, with an identity or bearer proof,
idempotency, and an audit event. We will specify that separately rather than
making the current E2E report a false success.

Clarification between parties is likewise not yet an open-ended chat channel.
Any future A2A transport should carry market-scoped questions and answers with
authority and disclosure rules; it should not be a hidden prerequisite for the
first no-clarification tests.
