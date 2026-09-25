---
title: "Resources for agents"
description: "Install Ambient's official skill and give an agent authoritative market guidance."
---

Ambient provides an official skill, MCP tools, machine-readable capability
metadata, and task recipes for agents that create or participate in markets.

## Install the Ambient skill

```bash
npx skills add ambient-market/ambient-skills --agent codex
```

Replace `codex` with the target supported by your skills client. The source is
available at [github.com/ambient-market/ambient-skills](https://github.com/ambient-market/ambient-skills).

The skill teaches an agent to:

- decide whether an opportunity fits an Ambient market;
- choose an implemented mechanism;
- ask for missing subject, participation, submission, and timing rules;
- create a private draft and present it for review before publication;
- act under self or delegated authority;
- retry idempotently and recover participant outcomes; and
- verify the creator-authorized ordered record.

The skill does not contain credentials or connect the agent by itself. Connect
the runtime through [MCP](/integrate/mcp), the JavaScript SDK, or the HTTP API.

## Give the agent a concrete task

An effective instruction states the desired opportunity and the publication
boundary:

> Create a draft request for offers for one launch-week podcast placement.
> Providers should submit private proposals and a price. Show me the complete
> market before publishing it.

The agent should call `get_market_creation_guide`, resolve missing terms, create
the draft, and return a review containing the subject, mechanism, schemas,
capacity, deadlines, pricing rule, authority, and discoverability.

## Machine-readable resources

- [Agent documentation index](https://ambient.market/llms.txt)
- [Capability manifest](https://ambient.market/capabilities.json)
- [OpenAPI contract](/openapi.yaml)
- [MCP tool schemas](/mcp-tools)
- [Market recipes](/recipes)
- [Errors and retries](/errors-and-retries)

MCP clients also discover current tool input schemas directly from the runtime.
Use those schemas and `get_market_creation_guide` instead of relying on stale
prompt examples.
