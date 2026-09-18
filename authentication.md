---
title: "Authentication and authority"
description: "Authenticate provisioned HTTP and MCP actors and understand how Ambient evaluates delegated authority."
---

Ambient authenticates a pre-registered Ed25519 actor key with a one-time proof,
then issues a short-lived opaque bearer token usable on both HTTP and MCP.
Key registration, rotation, account management, and public delegation
administration remain outside the implemented API.

Authentication establishes the actor sending a request. The `principalId` in
a command identifies whom the actor represents; it does not authenticate the
actor.

## Public-key proof and short-lived tokens

Request an unsigned challenge:

```http
POST /v1/auth/challenges
Content-Type: application/json

{"actorId":"agent-1","keyId":"key-1"}
```

The response contains the actor, key, audience, one-time nonce, expiry, and
`signingPayload`. Decode `signingPayload` from unpadded base64url and sign the
resulting bytes directly with the registered Ed25519 private key. Exchange the
proof before the challenge expires:

```http
POST /v1/auth/tokens
Content-Type: application/json

{
  "challengeId": "challenge_...",
  "nonce": "...",
  "signature": "<unpadded-base64url-Ed25519-signature>"
}
```

The result contains an opaque `accessToken`, token type `Bearer`, actor ID, and
expiry. Send it to either the HTTP API or `/mcp`:

```text
Authorization: Bearer <accessToken>
```

Challenges are single-use. Ambient stores hashes rather than raw challenge
nonces or access tokens. Token validation checks its audience and expiry plus
the actor's and key's current active state. Defaults are a two-minute challenge
and a fifteen-minute token, configurable with `AUTH_CHALLENGE_TTL`,
`AUTH_TOKEN_TTL`, and `AUTH_AUDIENCE`.

## Bootstrap HMAC requests

The environment-backed HMAC scheme remains available as a bootstrap and
operator-compatibility path. A signed request includes:

```text
X-Ambient-Actor: restaurant-1
X-Ambient-Timestamp: 1789828800
Authorization: Ambient-HMAC <base64url-signature-without-padding>
```

Calculate a lowercase hexadecimal SHA-256 hash over the exact request-body
bytes. Then join these fields with one newline and no trailing newline:

```text
ambient-hmac-v1
{actorId}
{unixTimestamp}
{UPPERCASE_METHOD}
{requestURIIncludingQuery}
{lowercaseHexSHA256OfBody}
```

Sign those UTF-8 bytes with HMAC-SHA256 using the actor secret, then encode the
result as unpadded base64url. The request URI is the path and query string, not
the scheme or host. A request with no body uses the SHA-256 hash of an empty
byte sequence.

Example in JavaScript:

```js
import { createHash, createHmac } from "node:crypto";

export function ambientHeaders({ actorId, secret, method, requestUri, body = "", now = new Date() }) {
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = [
    "ambient-hmac-v1",
    actorId,
    timestamp,
    method.toUpperCase(),
    requestUri,
    bodyHash,
  ].join("\n");
  const signature = createHmac("sha256", secret)
    .update(canonical)
    .digest("base64url");
  return {
    "X-Ambient-Actor": actorId,
    "X-Ambient-Timestamp": timestamp,
    Authorization: `Ambient-HMAC ${signature}`,
    "Content-Type": "application/json",
  };
}
```

Sign the exact serialized body that is transmitted. Reformatting JSON after
signing changes its hash and invalidates the request. Requests outside the
deployment's configured clock-skew window are rejected.

`GET /healthz` and the two `/v1/auth/*` proof routes are unsigned.

## Bootstrap MCP bearer tokens

The Streamable HTTP MCP endpoint also accepts a provisioned static opaque token:

```text
Authorization: Bearer <token>
```

The static token maps to one actor and is distinct from the HTTP HMAC secret.
Both static and short-lived bearer credentials pass the resulting actor through
the same application authority checks used by HTTP.

## Acting for another principal

When actor and principal IDs match, Ambient permits self-representation. When
they differ, include `authorityRef` in the command. The referenced delegation
must:

- name the authenticated actor and represented principal;
- include the command's exact authority scope;
- be active at the time of authorization; and
- not be revoked.

The current public HTTP and MCP surfaces do not create or revoke delegations.

## Current security boundary

Use both transports only over TLS. Public-key proof authenticates a registered
actor; it does not register keys, decide whom the actor may represent, or make
delegations portable. Persisted Ambient delegations remain the authoritative
authorization record. OAuth, DIDs, and verifiable credentials are not
implemented.
