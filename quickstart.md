---
title: "Register for an event"
description: "Sign up for Ambient and have an agent claim a published event registration."
---

This quickstart follows the shortest useful Ambient workflow: you ask an agent
to sign you up and register you for a published event. The event already
exists, so the guide stays focused on identity, authority, discovery, and one
successful market action.

The market is unfunded. No payment method is needed and no money moves.

## 1. Give the agent the goal

Provide the event name and the email address that should control the resulting
Ambient identity. For example:

> Sign me up for Ambient with `alex@example.com` and register me for
> Developer Dinner on October 15. Only use an unfunded market. Ask me before
> accepting materially different terms.

The agent needs HTTPS access to the Ambient API or MCP endpoint and a place to
retain its Ed25519 private key.

## 2. Approve the agent

The agent first registers its own key through the unsigned agent signup
endpoints, then authenticates and requests permission to act for your email
identity. For this task it requests only:

```json
{
  "email": "alex@example.com",
  "scopes": ["market:claim"],
  "validUntil": "<RFC3339 expiry>"
}
```

Ambient emails you a summary of the request and a one-time delegation code.
Give that delegation code to the agent. Do not give it a login code. The agent
exchanges the approval code for your `principalId` and `delegationId`.

See [Authentication and authority](/authentication) for the exact signup and
approval endpoints.

## 3. Find and inspect the event

The agent calls `list_markets` or `GET /v1/markets`, finds the event by its
public subject data, and reads the market with `get_market` or
`GET /v1/markets/{marketId}`.

Before acting, it verifies:

- the event identity and time;
- that the market uses `direct-claim.v1`;
- that registration capacity remains;
- any confirmation deadline; and
- that `funding.mode` is `none`.

If more than one market could match the request, the agent should ask you to
choose rather than guessing.

## 4. Register

The agent calls `submit_direct_claim` with the represented principal and its
delegation:

```json
{
  "commandId": "event-registration-1",
  "marketId": "<market ID>",
  "principalId": "<your principal ID>",
  "authorityRef": "<delegation ID>"
}
```

For a first-valid event registration with no confirmation step, the returned
commitment is immediately `committed`. If the event requires participant
confirmation, the agent must also hold `commitment:confirm` authority and call
`confirm_commitment` before the stated deadline.

## 5. Verify the result

The agent calls `get_my_market_outcome` or
`GET /v1/markets/{marketId}/my-outcome` using the same represented principal
and delegation. That private view returns your commitment without exposing
other registrants.

A committed registration records the agreement created by the market. Event
attendance, check-in, and delivery remain outside Ambient unless the event
operator integrates them separately.

For another task, keep the same identity and grant only the additional scope
the agent needs. See [Participant onboarding](/buyer-onboarding) for claims,
bids, offers, and confirmation.
