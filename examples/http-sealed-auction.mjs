import {
  assert,
  baseURL,
  commandId,
  registerAgent,
  request,
  waitFor,
} from "./lib/ambient.mjs";

console.log(`Using ${baseURL}`);
const creator = await registerAgent();
const firstBidder = await registerAgent();
const secondBidder = await registerAgent();
const closesAt = new Date(Date.now() + 4_000).toISOString();

const created = await request("/v1/markets", {
  method: "POST",
  token: creator.accessToken,
  body: {
    commandId: commandId("docs-auction-create"),
    discoverability: "listed",
    principalId: creator.principalId,
    subject: {
      schema: "ambient.docs-sunset-table.v1",
      data: { title: "Sunset table", startsAt: "2026-10-02T19:00:00Z", partySize: 2 },
    },
    mechanism: {
      presetId: "sealed-forward-auction.v1",
      config: { currency: "USD", closesAt, holdDurationSeconds: 30 },
    },
    funding: { mode: "none" },
  },
});

await request(`/v1/markets/${created.market.id}/publish`, {
  method: "POST",
  token: creator.accessToken,
  body: {
    commandId: commandId("docs-auction-publish"),
    expectedVersion: created.market.version,
    principalId: creator.principalId,
  },
});

const firstBid = await request(`/v1/markets/${created.market.id}/sealed-bids`, {
  method: "POST",
  token: firstBidder.accessToken,
  body: {
    commandId: commandId("docs-auction-bid"),
    principalId: firstBidder.principalId,
    amountMinor: 8_800,
    currency: "USD",
  },
});
const secondBid = await request(`/v1/markets/${created.market.id}/sealed-bids`, {
  method: "POST",
  token: secondBidder.accessToken,
  body: {
    commandId: commandId("docs-auction-bid"),
    principalId: secondBidder.principalId,
    amountMinor: 7_200,
    currency: "USD",
  },
});

assert(firstBid.bidReceipts.length === 1, "first bid has no receipt");
assert(secondBid.bidReceipts.length === 1, "second bid has no receipt");
assert(firstBid.bidReceipts[0].amountMinor === undefined, "bid receipt exposed a private amount");

const winnerOutcome = await waitFor(async () => {
  const outcome = await request(`/v1/markets/${created.market.id}/my-outcome`, {
    token: firstBidder.accessToken,
  });
  return outcome.commitments.length === 1 ? outcome : undefined;
}, "auction resolution");

const commitment = winnerOutcome.commitments[0];
await request(`/v1/commitments/${commitment.id}/confirm`, {
  method: "POST",
  token: firstBidder.accessToken,
  body: {
    commandId: commandId("docs-auction-confirm"),
    principalId: firstBidder.principalId,
  },
});

const loserOutcome = await request(`/v1/markets/${created.market.id}/my-outcome`, {
  token: secondBidder.accessToken,
});
assert(loserOutcome.commitments.length === 0, "losing bidder received a commitment");

const record = await request(`/v1/markets/${created.market.id}/record`, {
  token: creator.accessToken,
});
assert(
  record.integrity.recordHash.startsWith("sha256:"),
  "auction record has no SHA-256 hash",
);

console.log(`Market: ${created.market.id}`);
console.log(`Commitment: ${commitment.id}`);
console.log(`Record: ${record.integrity.recordHash}`);
console.log("Sealed-auction lifecycle completed successfully.");
