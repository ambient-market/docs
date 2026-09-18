---
title: "HTTP API overview"
description: "Request conventions, disclosure rules, idempotency, and error behavior for the HTTP API."
---

The HTTP API exposes typed market commands and queries as JSON plus a trusted
operator provisioning command. It does not provide discovery, self-service
account management, credential issuance, delegation administration, payment,
or a user interface.

Use the **HTTP endpoints** section in the sidebar for field types, required
fields, constraints, request examples, response schemas, and status codes for
each operation. The complete machine-readable contract is also available as
[OpenAPI YAML](/openapi.yaml).

Market and commitment requests require a short-lived bearer token or bootstrap
HMAC authentication as described in [Authentication](/authentication). The
challenge and token exchange routes are unsigned. Request bodies are strict
JSON: unknown fields and multiple JSON values are rejected, and the maximum
body size is 1 MiB. Ambient supplies authoritative command times; clients must
not send `occurredAt` or `actorId`.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/healthz` | Unsigned process health check. |
| `POST` | `/v1/auth/challenges` | Request a one-time challenge for a registered actor key. |
| `POST` | `/v1/auth/tokens` | Exchange a signed challenge for a short-lived bearer token. |
| `POST` | `/v1/admin/identities` | Allowlisted operator provisions a principal, actor, and first Ed25519 key. |
| `POST` | `/v1/markets` | Create a draft using a supported preset. |
| `POST` | `/v1/markets/{marketId}/publish` | Publish a reviewed draft. |
| `POST` | `/v1/markets/{marketId}/direct-claims` | Claim direct-claim capacity. |
| `POST` | `/v1/markets/{marketId}/sealed-bids` | Submit one private sealed bid. |
| `POST` | `/v1/commitments/{commitmentId}/confirm` | Confirm exact commitment terms. |
| `POST` | `/v1/commitments/{commitmentId}/decline` | Decline a pending commitment. |
| `GET` | `/v1/markets/{marketId}` | Read the current market snapshot. |
| `GET` | `/v1/markets/{marketId}/record` | Read the creator-authorized full record. |

## Command envelopes

Create-market bodies contain:

```text
commandId, marketId, principalId, authorityRef?, subject, mechanism
```

Publish bodies contain:

```text
commandId, expectedVersion, principalId, authorityRef?
```

Direct-claim bodies contain:

```text
commandId, expectedVersion?, principalId, authorityRef?
```

Sealed-bid bodies contain:

```text
commandId, principalId, authorityRef?, amountMinor, currency
```

Commitment confirmation and decline bodies contain:

```text
commandId, principalId, authorityRef?
```

Path identifiers are authoritative for market and commitment actions. When the
authenticated actor differs from `principalId`, `authorityRef` is required.

The trusted identity-provisioning body contains:

```text
commandId, principalId, actorId, keyId, publicKey
```

`publicKey` is an unpadded base64url Ed25519 public key. The route is mounted
only when `AMBIENT_OPERATOR_ACTORS` configures at least one operator, and the
authenticated caller must be on that allowlist. Creating distinct actor and
principal IDs does not grant authority between them.

## Reads and disclosure

Any authenticated actor can read a current market snapshot. The complete
record includes command inputs and decisions, commitments, events, and
integrity metadata. It is restricted to the creator principal or the actor that
created the market.

While a sealed auction is open, bid command bodies in that creator-visible
record are replaced with `{"sealed":true}`. Public bid receipts and events
also omit the amount.

## Idempotency and concurrency

Command IDs are scoped to the authenticated actor. An exact replay returns the
stored decision, including a stored deterministic rejection. Reusing an ID
with different content returns HTTP `409` with `idempotency_conflict`.

Publish uses `expectedVersion`. Direct claims may omit it to use authoritative
server arrival order. The application re-evaluates commands after bounded
optimistic-concurrency conflicts so a losing allocation normally receives the
authoritative deterministic rejection.

## Errors

Errors use a stable envelope:

```json
{
  "error": {
    "code": "version_conflict",
    "message": "..."
  }
}
```

Application rejection codes are:

```text
invalid_command
authority_reference_required
unknown_mechanism
invalid_mechanism_config
market_not_found
commitment_not_found
principal_not_authorized
version_conflict
invalid_market_transition
invalid_commitment_transition
actor_not_authorized
capacity_exhausted
```

Transport and persistence failures may also return `invalid_request`,
`unauthenticated`, `forbidden`, `not_found`, `method_not_allowed`,
`idempotency_conflict`, `concurrent_update`, or `internal_error`.
