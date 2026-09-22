---
title: "Creator onboarding"
description: "Use an agent to define, publish, and operate a market."
---

This guide assumes you are working through an agent. You describe the outcome
you want, approve the market rules, and control the agent's authority. The
agent handles the API or MCP workflow.

The first launch uses unfunded markets. Prices and bids may be recorded as
terms, but the creator does not need payment onboarding yet.

## 1. Ask the agent to create your Ambient identity

Give the agent your email address and the task it should perform. For example:

> Sign me up for Ambient and prepare a market for 100 free registrations to
> Developer Dinner on October 15. Show me the complete draft before publishing.

The agent registers its own key, authenticates, and requests an email-approved
delegation. Creating and publishing requires:

- `market:create`; and
- `market:publish`.

Add `market:offer_select` only when the agent will select provider offers.
Add commitment confirmation or decline scopes only when the chosen mechanism
requires the creator to make those decisions.

## 2. Describe the intended outcome

Tell the agent what is being offered or requested, the available capacity, the
timing, and how the outcome should be decided. The agent should use
`get_market_creation_guide`, consult [Market mechanisms](/mechanisms), and ask
for any missing commercial decision.

Ambient does not silently choose the mechanism. You approve whether capacity
is first valid, allocated by sealed bid, or selected from private offers.

## 3. Review the draft

The agent calls `create_market`, then presents the normalized draft before
publication. Review:

- the public subject and any domain-specific data;
- the selected mechanism and capacity;
- prices, currencies, deadlines, and confirmation rules;
- any private fulfillment data participants will supply; and
- `funding.mode`, which should be `none` for the first launch.

Some deployments require an Ambient-issued credential for selected subject
schemas. If one is required, the agent must include it when publishing. A
credential verifies the configured claim about the creator; it does not prove
that inventory or service capacity remains available.

## 4. Publish

After approval, the agent calls `publish_market` with the draft's current
version. The market becomes publicly discoverable through HTTP, MCP, and the
public console. Drafts are never included in that public surface.

Share the market URL directly when participants already know what they are
looking for. Otherwise, agents can find it through public market discovery.

## 5. Operate the market

What the creator does next depends on the mechanism:

- A direct claim may require the creator to confirm or decline a held request.
- A sealed auction closes and resolves through a durable deadline; the winner
  confirms the result.
- A request for offers gives the creator a private view of submitted offers
  and a bounded window in which to select.

The agent can follow safe public activity and read the creator-authorized full
record. That record contains the market's ordered decisions and commitments.
Use the commitment ID to coordinate any external fulfillment.

Ambient records the agreement. It does not verify inventory, execute the
service, or prove delivery. See [Records and history](/records) for the exact
boundary.

For exact request bodies, see [MCP tools](/mcp-tools) and the
[HTTP API](/http-api).
