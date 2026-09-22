---
title: "Authentication and authority"
description: "Register, authenticate, and delegate authority for HTTP and MCP."
---

Ambient authenticates an Ed25519 actor key with a one-time proof, then issues
a short-lived opaque bearer token usable on both HTTP and MCP. An agent may
self-register its first key; an allowlisted operator may still provision an
identity through the trusted administrative endpoint. Humans may sign up or
log in with an email code. Key rotation remains outside the implemented API.
A self-representing principal can issue and revoke scoped delegations through
HTTP.

Authentication establishes the actor sending a request. The `principalId` in
a command identifies whom the actor represents; it does not authenticate the
actor.

Bootstrap HMAC and static MCP credentials may identify an actor before it has
a durable identity row. Once that actor is registered, Ambient checks its
current lifecycle status after bootstrap authentication and rejects it when
disabled. Market authorization independently rejects registered disabled
principals and actors.

## Self-service signup and agent-led approval

Agent signup is two unsigned HTTP calls:

1. `POST /v1/signup/agent-challenges` with an unpadded base64url Ed25519
   `publicKey`. Ambient returns a challenge, proposed `principalId` and
   `keyId`, and a base64url `signingPayload`.
2. Sign the decoded payload bytes and call `POST /v1/signup/agents` with
   `{ "challengeId": "...", "signature": "<base64url signature>" }`.
   The principal, self-representing actor, and first key are created together
   only after proof. Then use `/v1/auth/challenges` and `/v1/auth/tokens` for
   a short-lived bearer token. Signup itself does not issue a token.

Anonymous agent challenge creation is capped at 30 attempts per minute and 300
per hour across API processes. Completion is separately capped at 120 attempts
per minute and 1,200 per hour; an accepted replay does not consume completion
quota. These shared ceilings bound work, not per-caller fairness. Ingress
abuse controls remain necessary before public launch.

For agent-led human signup, the authenticated agent calls
`POST /v1/signup/delegation-requests` with `email`, `scopes`, and
`validUntil`; include `paymentMandate` when requesting `payment:authorize`.
Ambient emails the person the agent ID, permissions, expiry, any payment
limits, and a one-time code. The person may relay **this delegation code** to
the agent, which submits it with `challengeId` to
`POST /v1/signup/delegation-approvals`. Ambient creates or finds the person's
principal and self-representing control actor, then records the scoped
delegation. The agent receives the principal and delegation IDs, not a human
session. The agent may then act with those IDs under the approved scopes.

For direct human signup/login, call `POST /v1/signup/email-challenges` with
`email`, then `POST /v1/signup/email-tokens` with `challengeId` and `code`.
That code has a different purpose: it returns a short-lived bearer token for
the human's own actor. **Do not give a login code to an agent.** The human can
use that token with the existing delegation-revocation endpoint, independently
of the agent. Email codes expire after 10 minutes, allow five attempts, and
are limited to one request per address and purpose per minute and five total
per address per hour. A login code cannot approve a delegation, and a
delegation code cannot log anyone in.
If synchronous email delivery fails, Ambient deletes the undelivered challenge
outside the request's cancellation context, reports a temporary failure, and
allows an immediate fresh request without charging the recipient's rate limit.
The provider call remains idempotently keyed by challenge ID. A durable email
outbox is intentionally deferred for v0.
Email tokens use `AUTH_TOKEN_TTL` (15 minutes by default), the same setting as
key-proof tokens.

Email delivery requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (a verified sender),
and `EMAIL_CODE_SECRET` (at least 32 bytes), configured together. Without
them, agent key signup works but email signup/approval returns an unavailable
error. Resend is only the delivery adapter; email identities, challenge
decisions, and delegated authority remain in Ambient. This is an API-first
flow; there is no human signup UI or MCP signup tool yet. An Agent Card is not
an identity or authority proof and is not used here.

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
different key material returns a conflict. Once an actor has a key, a new
provisioning command cannot attach another one; key addition and rotation need
a future explicit lifecycle operation. Accepted decisions and identity-conflict
rejections are retained durably. The endpoint is not mounted when the operator
allowlist is empty.

Provisioning an actor and a differently named principal does not itself grant
the actor authority over that principal. A separate active delegation is still
required. Use the same ID for both when provisioning a self-representing actor.

## Signed credential issuance

`AMBIENT_CREDENTIAL_ISSUER` configures one issuer principal, issuing actor,
registered signing-key ID, and unpadded base64url Ed25519 seed or private key.
The endpoint is mounted only when that configuration is present. The issuing
actor may submit subject, type, claims, and optional expiry to
`POST /v1/admin/credentials`; issuer identity, key identity, and issue time are
server-controlled.

Ambient signs a canonical `ambient-credential.v1` payload, verifies it against
the public key already registered for the issuing actor, and atomically stores
the credential with its command decision. Exact retries return the original
signed credential. The configured issuer can read its status at
`GET /v1/admin/credentials/{credentialId}` and irrevocably revoke it with
`POST /v1/admin/credentials/{credentialId}/revoke`. The signed issuance payload
remains immutable; `revokedAt` is authoritative Ambient registry status.

Deployments may configure subject-schema admission rules with
`AMBIENT_CREDENTIAL_ADMISSION`. A matching draft cannot be published unless the
publisher presents a currently valid credential of the configured type, issued
by the configured principal, for the market creator. The credential subject,
issuer, and issuing actor must all be active when the publication is admitted.
Portable W3C VC encoding, DIDs, public subject-facing credential lookup, and
key rotation are not implemented.

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
  "validUntil": "2030-10-01T00:00:00Z"
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

Payment authority uses this same boundary. The `payment:authorize` scope
requires both `validUntil` and a `paymentMandate`:

```json
{
  "commandId": "issue-payment-delegation-1",
  "delegationId": "payment-delegation-1",
  "principalId": "diner-1",
  "delegateActorId": "diner-agent-1",
  "scopes": ["payment:authorize"],
  "paymentMandate": {
    "railId": "fake-rail",
    "currency": "USD",
    "maxAmountMinor": 20000,
    "payeePrincipalId": "restaurant-1",
    "marketId": "table-friday"
  },
  "validUntil": "2030-01-01T01:00:00Z"
}
```

The maximum is checked independently for every authorization; it is not an
aggregate spending budget. Payee and market restrictions are optional, but
rail, currency, positive maximum, and expiry are required.

The `payment:register_payee_rail` scope lets a payee delegate the narrow act of
binding that principal to a configured payment rail. It carries no spending
mandate and does not authorize market creation, publication, or payment. A
self-representing payee needs no delegation. New self-service registrations are
temporarily blocked because signup does not verify ownership of the connected
payment account; the operator bootstrap route remains available.

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
record. OAuth, DIDs, and portable verifiable credentials are not implemented.
