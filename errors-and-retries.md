---
title: "Errors and retries"
description: "Recover safely from authentication, transport, contention, and rejected market actions."
---

Ambient returns a stable error `code` and a human-readable `message`. HTTP
responses also include `X-Request-ID`; retain it when reporting an unexpected
failure. Clients should branch on the code, not the message.

## Decide whether to retry

| What happened | Safe response |
| --- | --- |
| The connection ended before the result was known | Repeat the exact command with the same `commandId` and identical body. |
| The server returned `429 rate_limited` | Wait for `Retry-After`, then repeat the exact request. |
| The server returned a transient `5xx` response | Repeat an exact command with the same `commandId`. Read-only requests may be retried normally. |
| The access token expired or the server returned `401 unauthenticated` | Obtain a fresh short-lived token, then repeat the request. Preserve the command ID and body for an exact command retry. |
| The server returned `version_conflict` or `concurrent_update` | Read current state and reconsider the action. If the intended request changes, use the new version and a new command ID. |
| Ambient rejected the market action | Do not loop. Use the stable code to identify the missing authority, invalid transition, exhausted capacity, invalid configuration, or other required correction. |
| The same command ID was used for different content | Stop. Generate a new command ID for the genuinely new request. |

## Authentication exchanges

The retry advice above applies to market commands, not one-use authentication
proofs. With [OAuth connections](/oauth-connections), a consumed code
or refresh-token replay revokes its token family. Renew using the current
refresh token, or reconnect if the exchange result was lost. Reconnecting
creates a new actor/grant, so recover an uncertain market outcome before
resubmitting; the old actor's command ID does not provide deduplication for
the new actor.

## Preserve idempotency

A command ID belongs to one authenticated actor and one exact request. Reusing
that ID with identical content returns the stored decision. Reusing it with
different content returns `idempotency_conflict`.

This distinction matters after a timeout. An unknown result is a retry of the
same command. A decision to change a market version, amount, schema, authority,
or any other input is a new command.

## Recover authoritative state

Do not infer a private result from public activity:

- participants use `GET /v1/markets/{marketId}/my-outcome` or
  `get_my_market_outcome`;
- requesters use their scoped offer read before selecting RFO offers;
- creators use `GET /v1/markets/{marketId}/record` or `get_market_record`;
- lottery creators use `get_lottery_review` while the market is open, since
  the complete audit returns 403 until resolution; and
- asynchronous payment callers poll the payment operation returned for their
  command.

The available creator record contains ordered market history and a content
hash. Direct-claim, request-for-offers and lottery records also report a
successful state reconstruction check. Independent sealed-auction
reconstruction is not yet implemented, so its record reports `stateReconstructed: false`.

## Report an unexpected failure

Capture the HTTP status, stable error code, `X-Request-ID`, command ID, and
route. Do not include bearer tokens, private keys, email codes, payment
credentials, or private offer content.
