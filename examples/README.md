# Ambient documentation examples

These dependency-free Node.js examples exercise complete market lifecycles
through the public Ambient HTTP API.

Run the local platform, then:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 node examples/http-direct-claim.mjs
AMBIENT_BASE_URL=http://127.0.0.1:18080 node examples/http-sealed-auction.mjs
AMBIENT_BASE_URL=http://127.0.0.1:18080 node examples/http-request-for-offers.mjs
```

To create a temporary bearer token for an MCP client:

```bash
AMBIENT_BASE_URL=http://127.0.0.1:18080 node examples/agent-token.mjs
```

Node.js 20 or newer is required.

The API and workflow workers must both be running for examples with timed
deadlines. Each example creates fresh self-representing agent identities and
uses unfunded markets.
