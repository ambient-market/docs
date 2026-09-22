---
title: "Payments"
description: "Implemented payment integration path, bounded authorization, and rail-neutral settlement."
---

The first launch supports **unfunded markets only**. Bids and priced offers in
those markets express proposed terms; Ambient does not collect or transfer
funds for them. The payment lifecycle below is implemented for integration
testing, not offered as a production payment service. The Stripe Connect
adapter has sandbox coverage, but principal-bound self-service Connect
onboarding, callbacks, and production reconciliation are not complete. The
fake rail moves no money.

Ambient uses one canonical payment lifecycle with multiple rail adapters. A
market mechanism decides allocation and economic terms; a payment rail proves
that the payer can fund those terms and executes the resulting settlement.
Market code must not contain Stripe-, chain-, wallet-, or provider-specific
branches.

## Initial lifecycle

```text
AUTHORIZED -> SETTLED -> REFUNDED
      |
      `------> CANCELED
```

- **Authorize** binds a maximum amount, currency, payer, payee, market, rail,
  and expiry. A card adapter may create a payment authorization; an escrow rail
  may lock or verify prefunded value.
- **Settle** transfers the final amount to the payee. It binds the payment to a
  commitment and may settle less than the authorized maximum when the rail
  declares that capability. A card adapter may capture; an escrow rail may
  release locked value.
- **Cancel** releases an unsettled authorization back to the payer. Auction
  losers and abandoned commitments use this transition.
- **Refund** reverses a settled payment. The initial contract supports only a
  full refund; partial refunds and disputes remain future lifecycle work.

The canonical record retains a rail reference as evidence. An adapter response
is validated and becomes authoritative only when Ambient atomically persists
the payment snapshot and finalizes the corresponding decision-journal command.

## Adapter contract

Each adapter exposes a descriptor containing:

- a stable rail identifier;
- supported currencies; and
- explicit support for authorization, settlement below the authorized
  maximum, cancellation, and refunds.

An adapter may also declare that a payee registration is required and name
the participant credential type used for authorization. Those declarations
remain rail-neutral metadata. Provider-specific validation and execution stay
inside the adapter.

Every operation carries an operation ID. Exact retries return the original
result; reuse with different input is an idempotency conflict. Requests use
positive minor currency units and bind authorization to the payer, payee, and
market. Settlement additionally binds the exact commitment. The payment
orchestrator, not an external caller or rail, supplies the provider operation
identifier. It derives that globally unique identifier from the authenticated
actor and the actor-scoped command ID.

Every production adapter must exercise the same lifecycle contract against its
sandbox implementation. When the first real adapter is added, the fake rail's
contract scenarios should be extracted into a shared adapter testkit. Provider
adapters remain responsible for callback signatures, error translation,
reconciliation, and receipt verification.

`internal/payment/fakerail` is deterministic test infrastructure. It exercises
the common contract across multiple rail identities and capability-limited
configurations, but never moves money or proves external settlement.

`internal/payment/stripe` is the first real-rail adapter spike. It maps the
same contract to card-backed USD payments as follows:

```text
Link wallet / agent -> seller-scoped Shared Payment Token
                    -> direct PaymentIntent on the seller's connected account
                    -> manual authorization hold
                    -> capture, cancel, or refund
```

The adapter creates the PaymentIntent with the connected account in the
`Stripe-Account` header, `capture_method=manual`, immediate confirmation, the
SPT in `payment_method_data[shared_payment_granted_token]`, and the pinned SPT
preview API version. Capture, cancellation, refund, and retrieval remain on the
pinned GA API version. It supports a one-time capture below the reserved
maximum, which is required by a second-price auction; Stripe releases the
uncaptured remainder.

The adapter intentionally does not request Stripe's optional extended
authorization feature because account and card-network eligibility varies and
the connected sandbox account rejected it. Ambient does not assume a fixed
seven- or thirty-day window. It reads the provider's actual `capture_before`
value and rejects an authorization whose hold cannot cover the requested
market horizon. If Stripe has already placed such an insufficient hold, the
adapter releases it before returning the rejection. A market that needs a
longer horizon therefore cannot admit funding from that authorization.

The Shared Payment Token is private delivery material. The API encrypts it with
AES-GCM and binds it to the authenticated actor, command, authorization, and
rail. PostgreSQL stores the ciphertext beside the payment job in the same
transaction; only a keyed fingerprint joins the idempotency hash. The worker
decrypts it only when calling Stripe, and terminal success or failure deletes
the row. Neither plaintext nor ciphertext enters a market command, unified
decision journal, participant payment view, market record, or canonical
authorization.

The connected account comes from a durable payee rail registration; the payer
cannot supply it. New registrations currently require the allowlisted operator
bootstrap route. Self-service HTTP and MCP registration reject new bindings
until principal-bound Connect onboarding proves account ownership. Stripe
registrations pair a public
Profile ID (`profile_...`) with the private connected account reference
(`acct_...`). The public Profile ID tells a participant or its agent how to
scope the Shared Payment Token. The worker resolves the private account only
when it calls Stripe. The canonical rail reference keeps the connected account
and PaymentIntent needed for later capture, cancellation, or refund. Both API
and workflow-worker use one shared runtime constructor, so setting
`STRIPE_SECRET_KEY` registers the same adapter and rail descriptor in both
processes. It also requires the same unpadded base64url 32-byte
`PAYMENT_MATERIAL_KEY`. Provider callbacks and reconciliation remain required
before production use.

At registration, the Stripe adapter retrieves the connected account using the
platform credential and accepts it only when Stripe returns the same account
ID with charges enabled. The lookup catches nonexistent, inaccessible,
disabled, and mistyped account IDs. It does not prove that an otherwise valid
connected account belongs to the named Ambient principal, nor does it prove the
Profile-to-account relationship. The authenticated payee boundary now proves
who requested the binding, while that payee still asserts that the Profile is
the correct public SPT target. Platform-created Connect onboarding and a
provider-verifiable Profile binding remain necessary before open self-service
onboarding.

Ambient does not currently enforce a one-to-one relationship between a rail
account and a principal. Such a uniqueness rule would not prove ownership and
could exclude a merchant that intentionally uses one payout account for
multiple principals. Principal-bound Connect onboarding must establish the
authoritative relationship before production self-service is enabled.

“Private adapter reference” means confidential from participants, not secret
from Ambient. The connected-account ID is retained in the internal journaled
registration command and registration table so the routing decision is
auditable. It is omitted from the registration response and market reads. This
differs from the one-use Shared Payment Token, whose plaintext and ciphertext
never enter the decision journal.

An explicit sandbox contract test is present but excluded from normal CI
because it consumes one seller-scoped token. On 2026-09-19 it passed against a
Stripe test connected account using an SPT minted by Stripe's official test
helper: USD 1.00 authorization, USD 0.75 capture, and full refund of the
captured amount. With a fresh token scoped to the connected test account, run:

```sh
STRIPE_SECRET_KEY=... \
STRIPE_TEST_CONNECTED_ACCOUNT_ID=acct_... \
STRIPE_TEST_SHARED_PAYMENT_TOKEN=... \
go test -tags=stripe_sandbox ./internal/payment/stripe \
  -run TestStripeSandboxLifecycle -count=1
```

The deployed sandbox proof exercises the same adapter through Ambient's API,
PostgreSQL state, workflow worker, settlement feedback, and market record. Put
a fresh test SPT in the ignored `.env.stripe-sandbox` file, then run:

```sh
make e2e-stripe-sandbox
```

The environment file must provide `STRIPE_SECRET_KEY`,
`STRIPE_TEST_CONNECTED_ACCOUNT_ID`, and `STRIPE_TEST_SHARED_PAYMENT_TOKEN`.
`STRIPE_TEST_PROFILE_ID` is optional until the connected-account Profile is
available; the test otherwise uses an explicitly asserted sandbox-only target.
The command consumes the SPT and captures USD 0.75 in Stripe test mode.
On 2026-09-20 this deployed lifecycle passed using an SPT minted by Stripe's
test helper on behalf of the connected test account: payee registration,
funded-market publication, encrypted material handoff, USD 1.00 authorization,
USD 0.75 capture, settlement feedback, and verified record reconstruction.
The run also established that the test-helper credential and the live Link
wallet flow are distinct: the former can be scoped with the connected-account
request context, while the latter requires the seller's `profile_...` network
ID.

A real Link-wallet SPT is a separate live-mode proof. For direct charges it
must be scoped to the connected account's Stripe Profile ID (`profile_...`),
not its account ID (`acct_...`). Stripe must enable connected-account profile
management for the platform before that profile can be created in the
Dashboard.

Ambient now has that discoverable rail-recipient boundary. An allowlisted
operator registers a payee against a configured rail through
`POST /v1/admin/payee-rails`. The command is idempotent and journaled, while the
response omits the private adapter reference. A funded market cannot publish
when an accepted rail requires a payee registration and the creator has none.
Participant-facing HTTP and MCP market reads derive
`paymentCredentialInstructions` from the immutable funding policy, the rail
descriptor, and the creator's registration. Each instruction contains only the
rail, credential type, and public target. Amount, currency, and expiry remain
the market and authorization request's existing rules rather than duplicated
provider configuration. The funding policy continues to declare accepted
rails; it does not embed Stripe or any other provider account details.

## Durable delivery

Payment commands enter the same globally ordered `commands` journal as market
and identity commands. They begin in `processing` because calling a payment
provider is an external effect that cannot safely occur inside a database
transaction. A `payment_jobs` row carries only delivery mechanics:

```text
pending -> leased -> succeeded
                  `-> pending (bounded retry)
                  `-> failed
```

A worker leases due jobs with `FOR UPDATE SKIP LOCKED`, calls the selected rail
outside the transaction, then atomically stores the canonical authorization
snapshot and finalizes the journal decision as accepted or rejected. Transient
failures use bounded exponential backoff. An expired lease is reclaimable after
a worker crash; replaying the deterministic provider operation ID prevents a
second external effect when the provider succeeded before Ambient committed.
Every lease acquisition increments the attempt count, including reclaim after
a crash. This deliberately treats an uncertain prior delivery as an attempt
because the earlier worker may already have called the rail.

The job table is not a second authoritative account. It records delivery and
recovery state. The unified journal records the decision; the authorization
table records the current rail-neutral payment state.

Every market-side authorization read now verifies those two representations.
PostgreSQL loads the materialized authorization and only that authorization's
ordered command history in one repeatable-read transaction. A transport-neutral
record service independently replays accepted authorize, settle, cancel, and
refund decisions; rejected or still-processing commands do not alter state. It
returns the authorization only when every reconstructed field matches the
snapshot, with timestamps compared at PostgreSQL's microsecond precision.
Claims, bids, auction promotion, settlement planning, and
cancellation therefore fail closed on record divergence. This verified read is
internal for now; participant-facing status and redaction remain a separate
interface decision.

Participants can queue authorization through `POST /v1/payment-authorizations`
or the `authorize_payment` MCP tool. Self-representing principals authorize
directly. An agent must cite an active delegation with the
`payment:authorize` scope and a payment mandate that fixes the rail, currency,
per-authorization maximum, optional payee and market, and the delegation expiry.
For the first real rail, a delegation may have only one outstanding
authorization: pending, leased, or successfully authorized and unexpired. A
failed, expired, canceled, settled, or refunded authorization releases that
slot. This is a conservative exposure bound, not an aggregate spending ledger.
The command returns a pending operation; the deployed workflow worker runs
payment delivery alongside market deadlines and settlement feedback. The actor
that queued it can poll the operation by its actor-scoped command ID over HTTP
or MCP. This safe projection returns lifecycle status, the current verified
authorization state when available, a stable rejection code, rail ID, and
timestamps. It does not expose provider errors, raw requests or results, rail
references, lease state, or journal entries; another actor receives the same
not-found result as a missing operation.

For a rail that requires private authorization material, the HTTP body or MCP
tool input also carries `paymentCredential`. Stripe expects a seller-scoped
Link Shared Payment Token. An ordinary rail rejects unexpected private
material, while a private-material rail fails closed when it is absent.

For a delegated authorization, the enqueue transaction locks and revalidates
the cited delegation, its `payment:authorize` scope, active window, revocation
state, and mandate bounds before it reserves the payment job. Concurrent
revocation and authorization therefore have one database order. An exact retry
of an authorization accepted before a later revocation still replays its stored
decision rather than being reinterpreted under current authority.

Markets carry an immutable funding policy: `none` or
`reserve_on_submission`, with an allowlist of rail IDs and a positive
settlement grace period. A funded direct claim or sealed bid is admitted only
when an existing authorization matches the market, payer, payee, currency,
required amount, accepted rail, required validity horizon, and mechanism rail
capabilities. Second-price auctions require lower-than-authorized settlement.
The accepted transition binds that authorization to the exact commitment or
private bid in the same serializable transaction. The binding is one-use, so
concurrent reuse rolls the entire second transition back. The private decision
journal retains the binding while participant and creator views redact it.

Funded auctions declare a final resolution deadline. Bid authorizations must
remain valid through that deadline plus settlement grace. Resolution and each
promotion revalidate the authorization; unusable bids are excluded and the
exclusion is recorded. Winner holds are capped at the resolution deadline.
For upgrade compatibility only, a stored funded auction created before this
field existed uses `closesAt + holdDurationSeconds`; new funded drafts must
declare the deadline explicitly.

Terminal market decisions atomically enqueue payment work in the same database
transaction: confirmation settles the winner at the committed price and
cancels losing authorizations; decline or expiry cancels the released winner
but leaves other bids funded while promotion remains possible; `no_trade`
cancels every remaining authorization. Direct-claim commitments use the same
settle/cancel rules. Rail calls remain asynchronous and require the payment
worker to run. The deterministic fake rail proves this lifecycle without moving
real money.

Commitment agreement and settlement delivery are separate state dimensions. A
funded committed result records settlement as `pending` and names the exact
payment operation. The payment worker first finalizes the rail decision and,
in the same transaction, creates a settlement-feedback outbox job. A separate
feedback worker submits an internal, idempotent
`commitment.record_settlement_outcome` command. The command preserves the
`committed` agreement while moving settlement to `settled` or `failed`, emits
an ordered market event, and is included in market record reconstruction. If
the feedback worker dies after recording the market command but before
completing its job, it replays that command with the same ID without calling
the payment rail again.

A settled commitment may be fully refunded by its market creator or an agent
holding `commitment:refund`. The command atomically records refund state
`pending` and queues a `payment.refund` operation for the commitment's exact
authorization. Payment delivery then creates the same durable feedback handoff
used by settlement; an internal idempotent outcome command records `refunded`
or `failed` and emits an ordered market event. Refund is a financial reversal,
not cancellation of the agreement: the commitment remains `committed` and the
mechanism does not reopen capacity. Partial refunds and participant-initiated
refund policy are not implemented. Transient delivery failures retry inside the
same payment operation. After a terminal failure, the creator may submit a new
refund command; that starts a new journaled operation with a new idempotency key
while preserving the failed attempt in the record.

A terminal settlement failure is deliberately observable rather than
automatically remedied: the commercial agreement remains `committed`, its
settlement dimension becomes `failed`, and the failure code is recorded. The
system does not release capacity, retry a deterministic rail rejection, or
promote another bidder without an explicit mechanism policy authorizing that
commercial consequence.

## Deliberately not implemented yet

- choosing among multiple accepted rails on behalf of a participant;
- payment-operation callbacks or participant payment-history discovery;
- configurable aggregate or consumable delegated spending budgets beyond the
  current one-outstanding-authorization rule;
- automatic market remediation after terminal settlement failure;
- provider callbacks, reconciliation, or external receipt verification;
- payee rail registration replacement or revocation;
- principal-bound Connect onboarding and verified Profile-to-account binding;
- encryption-key identifiers, rotation, and cleanup of expired private
  material that is never revisited by a worker;
- partial refunds, participant-initiated refund policy, disputes, chargebacks,
  exchange quotes, or asset-native
  denominations;
- any additional bank, stablecoin, crypto, or agent-payment adapter.
