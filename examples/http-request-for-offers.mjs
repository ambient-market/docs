import {
  assert,
  baseURL,
  commandId,
  registerAgent,
  request,
  waitFor,
} from "./lib/ambient.mjs";

console.log(`Using ${baseURL}`);
const requester = await registerAgent();
const firstProvider = await registerAgent();
const secondProvider = await registerAgent();
const offersCloseAt = new Date(Date.now() + 4_000);
const selectionClosesAt = new Date(offersCloseAt.getTime() + 30_000);

const created = await request("/v1/markets", {
  method: "POST",
  token: requester.accessToken,
  body: {
    commandId: commandId("docs-rfo-create"),
    discoverability: "listed",
    principalId: requester.principalId,
    subject: {
      schema: "ambient.docs-podcast-placement-request.v1",
      data: { title: "Launch-week podcast placement", audience: "Software developers" },
    },
    mechanism: {
      presetId: "request-for-offers.v1",
      config: {
        capacity: 1,
        offerSchema: "ambient.docs-podcast-placement-offer.v1",
        offersCloseAt: offersCloseAt.toISOString(),
        selectionClosesAt: selectionClosesAt.toISOString(),
        selectionTiming: "after_deadline",
        pricing: { mode: "required", currency: "USD", maximumAmountMinor: 50_000 },
      },
    },
    funding: { mode: "none" },
  },
});

await request(`/v1/markets/${created.market.id}/publish`, {
  method: "POST",
  token: requester.accessToken,
  body: {
    commandId: commandId("docs-rfo-publish"),
    expectedVersion: created.market.version,
    principalId: requester.principalId,
  },
});

const firstOffer = await request(`/v1/markets/${created.market.id}/offers`, {
  method: "POST",
  token: firstProvider.accessToken,
  body: {
    commandId: commandId("docs-rfo-offer"),
    principalId: firstProvider.principalId,
    terms: {
      schema: "ambient.docs-podcast-placement-offer.v1",
      data: { summary: "Developer tools show with a host-read midroll" },
    },
    amountMinor: 40_000,
  },
});
const secondOffer = await request(`/v1/markets/${created.market.id}/offers`, {
  method: "POST",
  token: secondProvider.accessToken,
  body: {
    commandId: commandId("docs-rfo-offer"),
    principalId: secondProvider.principalId,
    terms: {
      schema: "ambient.docs-podcast-placement-offer.v1",
      data: { summary: "Engineering leadership show with a host-read preroll" },
    },
    amountMinor: 35_000,
  },
});

const firstOfferId = firstOffer.offerReceipts[0].offerId;
const secondOfferId = secondOffer.offerReceipts[0].offerId;

const firstProviderView = await request(`/v1/markets/${created.market.id}/offers`, {
  token: firstProvider.accessToken,
});
assert(firstProviderView.offers.length === 1, "provider did not receive its own scoped offer");
assert(firstProviderView.offers[0].id === firstOfferId, "provider received the wrong offer");

await waitFor(async () => {
  const view = await request(`/v1/markets/${created.market.id}/offers`, {
    token: requester.accessToken,
  });
  return view.market.mechanismState.phase === "awaiting_selection" ? view : undefined;
}, "offer deadline");

const selected = await request(`/v1/markets/${created.market.id}/offer-selections`, {
  method: "POST",
  token: requester.accessToken,
  body: {
    commandId: commandId("docs-rfo-select"),
    principalId: requester.principalId,
    offerIds: [secondOfferId],
  },
});
assert(selected.commitments.length === 1, "selection did not create a commitment");

const firstOutcome = await request(`/v1/markets/${created.market.id}/my-outcome`, {
  token: firstProvider.accessToken,
});
const secondOutcome = await request(`/v1/markets/${created.market.id}/my-outcome`, {
  token: secondProvider.accessToken,
});
assert(firstOutcome.offers[0].state === "not_selected", "first offer has the wrong outcome");
assert(secondOutcome.offers[0].state === "selected", "selected offer has the wrong outcome");

const record = await request(`/v1/markets/${created.market.id}/record`, {
  token: requester.accessToken,
});
assert(record.privateOffers.length === 2, "creator record omitted private offers");
assert(record.integrity.stateReconstructed, "RFO state did not reconstruct from its record");

console.log(`Market: ${created.market.id}`);
console.log(`Selected offer: ${secondOfferId}`);
console.log(`Commitment: ${selected.commitments[0].id}`);
console.log(`Record: ${record.integrity.recordHash}`);
console.log("Request-for-offers lifecycle completed successfully.");
