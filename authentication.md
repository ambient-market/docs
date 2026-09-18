---
title: "Authentication and authority"
description: "Authenticate provisioned HTTP and MCP actors and understand how Ambient evaluates delegated authority."
---

Ambient authenticates a pre-registered Ed25519 actor key with a one-time proof,
then issues a short-lived opaque bearer token usable on both HTTP and MCP.
An allowlisted operator can create the initial principal, actor, and key through
a trusted administrative endpoint. Self-service registration, key rotation,
and account management remain outside the implemented API. A self-representing
principal can issue and revoke scoped delegations through HTTP.

Authentication establishes the actor sending a request. The `principalId` in
a command identifies whom the actor represents; it does not authenticate the
actor.

## Trusted identity provisioning

Set `AMBIENT_OPERATOR_ACTORS` to a comma-separated list of actors that can
authenticate to the HTTP boundary, initially through bootstrap HMAC. An
authenticated actor on that allowlist may call:

```http
POST /v1/admin/identities
Content-Type: application/json

{
  "commandId": "provision-agent-1",
  "principalId": "agent-1",
  "actorId": "agent-1",
  "keyId": "agent-key-1",
  "publicKey": "<unpadded-base64url-Ed25519-public-key>"
}
```

Ambient server-stamps the command and atomically creates all three records. The
command ID is idempotent within the operator actor's namespace. Exact retries
return the original result; changed content or an identifier already bound to
different key material returns a conflict. Accepted decisions and
identity-conflict rejections are retained durably. The endpoint is not mounted
when the operator allowlist is empty.

Provisioning an actor and a differently named principal does not itself grant
the actor authority over that principal. A separate active delegation is still
required. Use the same ID for both when provisioning a self-representing actor.

## Issuing and revoking authority

The authenticated actor whose ID equals the principal ID can issue a bounded
delegation:

```http
POST /v1/delegations
Content-Type: application/json

{
  "commandId": "issue-delegation-1",
  "delegationId": "delegation-1",
  "principalId": "restaurant-1",
  "delegateActorId": "restaurant-agent-1",
  "scopes": ["market:create", "market:publish"],
  "validUntil": "2026-10-01T00:00:00Z"
}
```

`validUntil` is optional. Ambient uses the server-stamped command time as
`validFrom`. Revoke the delegation with:

```http
POST /v1/delegations/delegation-1/revoke
Content-Type: application/json

{"commandId":"revoke-delegation-1","principalId":"restaurant-1"}
```

Issue and revoke command IDs are scoped to the authenticated actor. Exact
retries return the stored decision, while changed content returns an
idempotency conflict. Missing identities, duplicate delegation IDs, missing
delegations, and repeated revocations are retained as deterministic rejected
decisions.

Delegation management is intentionally not delegable in this version: an
existing agent cannot issue another delegation even if it can otherwise act
for the principal. The principal therefore needs a self-representing control
actor, while operational agents may use distinct actor IDs.

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

The HTTP surface issues and revokes delegations. MCP market tools consume those
same persisted delegations but do not yet manage them.

## Current security boundary

Use both transports only over TLS. Public-key proof authenticates a registered
actor; it does not decide whom the actor may represent or make delegations
portable. Persisted Ambient delegations remain the authoritative authorization
record. OAuth, DIDs, and verifiable credentials are not implemented.
