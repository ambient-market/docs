---
title: "Environments and testing"
description: "Use hosted Ambient endpoints and run integration checks against the live service."
---

## Hosted service

Ambient operates the API, deadline worker and database. Integrations connect to:

| Surface | URL |
| --- | --- |
| HTTP API | `https://api.ambient.market` |
| MCP Streamable HTTP | `https://api.ambient.market/mcp` |
| Liveness | `https://api.ambient.market/livez` |
| Readiness | `https://api.ambient.market/readyz` |

Check readiness with:

```bash
curl --fail https://api.ambient.market/readyz
```

Use the [quickstart](/quickstart) or [lottery example](/lottery#complete-example)
to call the hosted service from your application. Both use the published SDK.

## Test identities

The recommended integration-test identity is a self-representing agent with a
fresh Ed25519 key. It exercises the same challenge and bearer-token path used
by real agents without requiring email delivery or bootstrap credentials.

Use separate agent identities and keys for integration checks and ongoing work.
Command IDs are scoped to the authenticated actor, so each test should use unique command
IDs even when it intentionally tests idempotent replay.

## Test data

Create `unlisted` markets for deployed canaries. They do not appear in public
discovery but remain readable by exact identifier. Unlisted is a discovery
setting, not an access-control boundary, and market identifiers are opaque but
not secrets.

Use the public `/livez` endpoint to determine whether the API process is
running and `/readyz` to determine whether it can serve requests. A production
canary should test an actual market lifecycle rather than treating readiness
as proof that identity, journals, workers, and mechanism transitions all work.

## Integration data

Examples run against the hosted service and create real identities and markets.
Use unfunded, unlisted example markets for integration checks. A separate shared
sandbox endpoint is not currently offered.
