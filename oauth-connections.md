---
title: "OAuth connections"
description: "Connect an application with browser email login, scoped consent, and authorization code + PKCE."
---

Use OAuth to connect an application on a person's behalf through
browser email login and explicit consent. Connect to Ambient at
`https://api.ambient.market/mcp`; the client handles discovery and the browser
authorization flow. See [MCP setup](/integrate/mcp) and the alternative
[key-based onboarding paths](/integrate/onboarding).

## What changes

An application can connect on a person's behalf without asking them to manage
an agent key or hand a login code to the agent. The person signs in on Ambient's
browser page and approves the application, requested scopes, and expiry.
Ambient creates an isolated connection actor and an ordinary scoped delegation
for that person's principal. Existing key-based signup remains supported.

OAuth authenticates the connection; Ambient's delegation still determines what
the actor may do. It does not verify a business or grant payment authority.

## Connection flow

1. The MCP client discovers the authorization server through the `401`
   challenge and `/.well-known/oauth-protected-resource/mcp` metadata.
2. If it has no client ID, the client registers itself through the advertised
   `registration_endpoint`. It then opens `/oauth/authorize` with its `client_id`,
   registered `redirect_uri`, `response_type=code`, requested `scope`, random
   `state`, S256 PKCE challenge, and `resource=<issuer>/mcp`.
3. The person enters their email and login code on Ambient's browser page.
   **The code stays between the person and Ambient, never in the agent chat.**
4. The person approves or denies the named application and permissions.
5. The client validates the returned state and exchanges the authorization
   code at `/oauth/token` with its client ID, callback, PKCE verifier and the
   same resource. Token requests are form-encoded, not market-command JSON.
6. The client uses the access token as a bearer credential for MCP. The same
   token is accepted by that deployment's Ambient HTTP services.
7. The agent calls `get_actor_context` or `get_market_creation_guide` to learn
   its `actorId`, approved `principalId`, and `authorityRef`. It must use the
   returned principal and grant, not assume `principalId == actorId`.

Use the discovered authorization-server metadata for endpoint URLs. The
client handles registration before starting authorization. The person does
not need to find or enter a client ID or callback URL.

## Client registration and permissions

Ambient supports dynamic registration for public code + PKCE clients. The
client submits its name and callback URLs and receives a client ID; no client
secret or access permission is issued by registration. Operator-configured
registrations also remain supported. A client ID identifies a registration,
not an individual person or verified software publisher. Ambient labels
self-registered application names as unverified on the consent screen.

HTTPS callbacks must match exactly. HTTP callbacks are allowed only to literal
loopback addresses; their listener port may vary, but address, path and query
must match registration. Registration is rate- and capacity-limited.

For Codex CLI, configure the remote server in `config.toml`:

```toml
[mcp_servers.ambient]
url = "https://api.ambient.market/mcp"
```

Then start its built-in login with the scopes needed for your task:

```bash
codex mcp login ambient --scopes market:create,market:publish
```

The client handles discovery, registration, callback, and tokens. Sign in and
approve in the browser; adjust scopes for the work you actually want to permit.
`--no-browser` supports environments where the browser cannot return directly
to the CLI. Follow its callback instructions without sharing the URL in chat.

Supported scopes are `market:create`, `market:publish`, `market:cancel`,
`market:claim`, `market:bid`, `market:offer_submit`, `market:offer_select`, `market:lottery_enter`,
`commitment:confirm`, and `commitment:decline`. Request only those needed.
Payment, payee registration, credential issuance, and refund scopes are not
available through this connection flow.

There is no remote client metadata fetching (CIMD),
OpenID Connect ID token, or client-credentials grant. Token exchange has been
tested from the client host; browser cross-origin token exchange is not a
supported compatibility claim of this slice.

## Renewal and disconnect

Authorization codes last two minutes. Access tokens last at most one hour,
and newly approved connections last at most thirty days. Refresh
uses `/oauth/token` with `grant_type=refresh_token`, the client ID, refresh
token, and resource. It rotates both tokens without extending consent or
changing scopes. Keep credentials in the application's secret store.

Existing connections keep the expiry approved when they were created. Reconnect
and approve again to receive the longer window; refresh does not extend it.

Do not apply market-command retries to token exchange: authorization codes and
refresh tokens are one-use. Replaying a consumed code or refresh token revokes
the token family. If an exchange response is lost, reconnect rather than
looping on the old credential. Refresh keeps the connection actor; reconnect
creates a new actor/grant. Recover an uncertain market outcome before
resubmitting under a new connection, since command IDs are actor-scoped.

The person can sign in at `/oauth/connections` and
disconnect the application. That revokes its delegation, stopping access and
renewal. `/oauth/revoke` also supports client-initiated token revocation.

## SDK integration

The TypeScript SDK can use an access token through `withToken`, then bind the
approved principal and grant with `forPrincipal(principalId, authorityRef)`.
It does not implement OAuth discovery, browser redirects, callbacks, token
exchange, refresh, or disconnect. Those belong to the connecting application
for now; the SDK does not infer the represented principal from a token.
