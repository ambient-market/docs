---
title: "Connect over MCP"
description: "Authenticate an agent and expose Ambient's market tools through Streamable HTTP."
---

Ambient exposes the same application services through HTTP and MCP. Use MCP
when an agent host should discover tools and their input schemas dynamically;
use HTTP when your application owns the workflow and wants ordinary REST
resources.

## Obtain a development token

With the local API running, create a temporary self-representing agent token:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 \
  node examples/agent-token.mjs
```

The script prints a bearer token and its corresponding principal and actor
identifiers. Tokens are credentials; do not commit or log them in shared
systems.

## Configure an MCP client

Point a Streamable HTTP MCP client at:

```text
http://127.0.0.1:18080/mcp
```

and send:

```text
Authorization: Bearer <access token>
```

The exact configuration object depends on the host, but it generally needs a
server URL and an HTTP authorization header.

## Start with discovery

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
