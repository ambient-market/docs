---
title: "Connect over MCP"
description: "Authenticate an agent and expose Ambient's market tools through Streamable HTTP."
---

Ambient exposes the same application services through HTTP and MCP. Use MCP
when an agent host should discover tools and their input schemas dynamically;
use HTTP when your application owns the workflow and wants ordinary REST
resources.

## Connect to hosted Ambient

Use [OAuth browser consent](/oauth-connections) when connecting an
application on a person's behalf, or supply a bearer token obtained through
key-based authentication. OAuth clients must support authorization code +
S256 PKCE. Clients supporting dynamic registration, including Codex CLI, can
register automatically; users do not supply application IDs or callbacks.

Ambient's hosted Streamable HTTP endpoint is:

```text
https://api.ambient.market/mcp
```

For OAuth, let the client discover the authorization server, register, and
open Ambient's email login and consent page. After approval, the client sends
the resulting bearer token with MCP requests. Login codes stay in the browser.

### Key-based alternative

MCP does not expose identity-signup tools. Bootstrap an agent identity and obtain a
short-lived bearer token through the [JavaScript SDK](/agent-resources#use-the-javascript-sdk) or HTTP
signup and authentication endpoints. Then configure the MCP client to send:

```text
Authorization: Bearer <access token>
```

Persist the agent's private key in an appropriate secret store so the client
can obtain a new token when the current token expires. Do not place the private
key or bearer token in a shared configuration file.

## Configure your MCP client

Use the hosted endpoint `https://api.ambient.market/mcp`. For an OAuth-capable
host, follow the [browser connection guide](/oauth-connections). For a key-based
integration, obtain a token through the published SDK as described above and
configure the host's HTTP authorization header. Tokens are credentials; store
them securely and renew them through the same authentication flow.

## Start with discovery

For OAuth connections, `get_actor_context` and
`get_market_creation_guide` also return the approved `principalId` and
`authorityRef`. Use both exactly; the connection actor is not the person it
represents. Key-based connections continue to follow the existing authority
rules.

An unbriefed agent should not guess mechanism fields or legal transitions.
Have it:

1. call `get_market_creation_guide` to learn the actor context, supported
   mechanisms, and draft-to-publication sequence;
2. call `list_markets` or `get_market` to inspect live market configuration;
3. submit the mechanism-specific action;
4. call `get_my_market_outcome` to recover receipts and commitments; and
5. use the returned version and deadlines rather than inventing local state.

See [MCP tool reference](/mcp-tools) for every tool and
[Authentication and authority](/authentication) for delegated actors. Install
the [official Ambient skill](/agent-resources) to give an agent the mechanism,
authority, review, and recovery guidance surrounding those tools.
