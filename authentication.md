---
title: "Authentication and authority"
description: "Authenticate provisioned HTTP and MCP actors and understand how Ambient evaluates delegated authority."
---

Ambient currently uses provisioned actor credentials. Credential issuance,
rotation, account management, and public delegation administration are outside
the implemented API.

Authentication establishes the actor sending a request. The `principalId` in
a command identifies whom the actor represents; it does not authenticate the
actor.

## Signed HTTP requests

Every `/v1` request uses an actor ID and HMAC secret provisioned out of band.
The request includes:

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

`GET /healthz` is the only unsigned HTTP route.

## MCP bearer tokens

The Streamable HTTP MCP endpoint accepts a provisioned opaque token:

```text
Authorization: Bearer <token>
```

The token maps to one actor. It is distinct from the HTTP HMAC secret. The MCP
adapter passes the resulting actor through the same application authority
checks used by HTTP.

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

Use both transports only over TLS. Static HMAC secrets and bearer tokens are
the first implemented authentication mechanisms, not the final public identity
system. OAuth, public-key registration, DIDs, and verifiable credentials are
not implemented.
