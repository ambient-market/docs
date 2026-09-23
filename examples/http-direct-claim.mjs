import {
  assert,
  baseURL,
  commandId,
  registerAgent,
  request,
} from "./lib/ambient.mjs";

console.log(`Using ${baseURL}`);
const creator = await registerAgent();
const participant = await registerAgent();

const created = await request("/v1/markets", {
  method: "POST",
  token: creator.accessToken,
  body: {
    commandId: commandId("docs-create"),
    externalRef: `docs-capacity-${Date.now()}`,
    discoverability: "listed",
    principalId: creator.principalId,
    subject: {
      schema: "ambient.docs-capacity.v1",
      data: {
        title: "Ambient documentation quickstart",
        description: "One capacity unit allocated to the first valid claimant.",
      },
    },
    mechanism: {
      presetId: "direct-claim.v1",
      config: {
        capacity: 1,
        pricing: { mode: "free" },
        confirmation: "none",
      },
    },
    funding: { mode: "none" },
  },
});
assert(created.market.state === "draft", "new market should be a draft");

const published = await request(`/v1/markets/${created.market.id}/publish`, {
  method: "POST",
  token: creator.accessToken,
  body: {
    commandId: commandId("docs-publish"),
    expectedVersion: created.market.version,
    principalId: creator.principalId,
  },
});
assert(published.market.state === "open", "published market should be open");

const discovery = await request("/v1/markets?limit=100");
assert(
  discovery.items.some((market) => market.id === created.market.id),
  "listed market was not discoverable",
);

const claimed = await request(`/v1/markets/${created.market.id}/direct-claims`, {
  method: "POST",
  token: participant.accessToken,
  body: {
    commandId: commandId("docs-claim"),
    principalId: participant.principalId,
  },
});
assert(claimed.commitments.length === 1, "claim did not create one commitment");
assert(claimed.commitments[0].state === "committed", "claim was not committed");

const outcome = await request(`/v1/markets/${created.market.id}/my-outcome`, {
  token: participant.accessToken,
});
assert(outcome.commitments.length === 1, "participant outcome omitted the commitment");
assert(
  outcome.commitments[0].id === claimed.commitments[0].id,
  "participant outcome returned the wrong commitment",
);

const record = await request(`/v1/markets/${created.market.id}/record`, {
  token: creator.accessToken,
});
assert(record.integrity.stateReconstructed, "market state did not reconstruct from its record");
assert(record.integrity.recordHash.startsWith("sha256:"), "market record has no SHA-256 hash");

console.log(`Market: ${created.market.id}`);
console.log(`Commitment: ${claimed.commitments[0].id}`);
console.log(`Record: ${record.integrity.recordHash}`);
console.log("Direct-claim lifecycle completed successfully.");

