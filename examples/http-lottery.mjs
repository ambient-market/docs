import { assert, baseURL, commandId, registerAgent, request, waitFor } from "./lib/ambient.mjs";

console.log(`Using ${baseURL}`);
const creator = await registerAgent();
const entrants = [await registerAgent(), await registerAgent()];
const entryClosesAt = new Date(Date.now() + 15_000);
const created = await request("/v1/markets", {
  method: "POST", token: creator.accessToken,
  body: {
    commandId: commandId("docs-lottery-create"),
    principalId: creator.principalId,
    discoverability: "unlisted",
    subject: {
      schema: "ambient.docs-giveaway.v1",
      data: { title: "Documentation giveaway", prize: "Example award delivered outside Ambient" },
    },
    mechanism: {
      presetId: "lottery.v1",
      config: {
        capacity: 1, entryClosesAt: entryClosesAt.toISOString(), confirmation: "creator",
        confirmationWindowSeconds: 120,
        resolutionDeadline: new Date(entryClosesAt.getTime() + 300_000).toISOString(),
        eligibilityTerms: "Submit an example reply URL. Both example entrants qualify; evidence is checked outside Ambient.",
      },
    },
    funding: { mode: "none" },
  },
});
const marketId = created.market.id;
await request(`/v1/markets/${marketId}/publish`, {
  method: "POST", token: creator.accessToken,
  body: { commandId: commandId("docs-lottery-publish"), principalId: creator.principalId, expectedVersion: created.market.version },
});

for (const [index, entrant] of entrants.entries()) {
  await request(`/v1/markets/${marketId}/lottery-entries`, {
    method: "POST", token: entrant.accessToken,
    body: { commandId: commandId("docs-lottery-enter"), principalId: entrant.principalId, evidenceUrl: `https://example.com/replies/${index + 1}` },
  });
  const own = await request(`/v1/markets/${marketId}/my-outcome`, { token: entrant.accessToken });
  assert(own.lotteryEntries.length === 1 && own.lotteryEntries[0].state === "active", "own entry receipt missing");
}

const unavailable = await fetch(`${baseURL}/v1/markets/${marketId}/record`, {
  headers: { Authorization: `Bearer ${creator.accessToken}` },
});
assert(unavailable.status === 403, "complete audit was available before resolution");
const review = await waitFor(async () => {
  const view = await request(`/v1/markets/${marketId}/lottery-review`, { token: creator.accessToken });
  return view.candidates.some(item => item.commitment.state === "awaiting_confirmations") ? view : undefined;
}, "worker draw", { attempts: 120, interval: 1_000 });
const candidate = review.candidates.find(item => item.commitment.state === "awaiting_confirmations");
assert(!JSON.stringify(review).includes('"actorId"'), "review exposed submitting actor metadata");
assert(!JSON.stringify(review).includes('"authorityRef"'), "review exposed delegation metadata");
for (const entrant of entrants) {
  assert(!candidate.entry.id.includes(entrant.actorId), "entry ID embeds an actor ID");
  assert(!candidate.commitment.id.includes(entrant.actorId), "commitment ID embeds an actor ID");
}
assert(candidate.entry.evidenceUrl?.startsWith("https://example.com/replies/"), "selected evidence missing");
// This example has already established that both submitted URLs qualify.
await request(`/v1/commitments/${candidate.commitment.id}/confirm`, {
  method: "POST", token: creator.accessToken,
  body: { commandId: commandId("docs-lottery-confirm"), principalId: creator.principalId },
});
let awards = 0;
for (const entrant of entrants) {
  const own = await request(`/v1/markets/${marketId}/my-outcome`, { token: entrant.accessToken });
  assert(own.market.state === "closed", "lottery has not resolved");
  awards += own.commitments.filter(item => item.state === "committed").length;
}
assert(awards === 1, "lottery did not award exactly one entrant");
const record = await request(`/v1/markets/${marketId}/record`, { token: creator.accessToken });
assert(record.integrity.stateReconstructed, "lottery audit did not reconstruct");
console.log(`Market: ${marketId}`);
console.log(`Commitment: ${candidate.commitment.id}`);
console.log(`Record: ${record.integrity.recordHash}`);
console.log("Lottery lifecycle completed successfully. Prize delivery remains external.");
