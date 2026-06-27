# Velora / Token Distribution Protocol — Status Report

**Date:** June 12, 2026
**Phase:** 2 (Week 8) — Bug Fixes & Stabilization
**Team:** Team 5, Mancer x Superteam Indonesia Career Accelerator S1

---

## Executive Summary

The Token Distribution Protocol (branded as **Velora**) is a Solana on-chain program that lets anyone create token vesting streams — lock SPL tokens into a vault and release them to recipients on a schedule. The on-chain program is solid and fully covered by tests. The web app drives the full lifecycle: create stream → view dashboard → withdraw → cancel.

**Week 8 focused on:** fixing vesting math bugs, enforcing authority checks, cleaning dead code, syncing docs with reality, and running full e2e test suites.

**Week 8 stabilization pass (this report) found and fixed a release-blocking frontend bug:** stream creation crashed at the final "Create Vesting" step for *every* schedule type, because the submit handler parsed the optional `cliffAmount` field with a parser that rejects `0` (the default value). No stream could be created from the UI. This is now fixed and re-verified. See [Bugs Fixed](#bugs-fixed-this-week-week-8) #5.

> **Verification scope (be honest about it):** the on-chain program is verified by 18 Rust unit tests + 23 TypeScript integration tests on a local validator (all passing, run this session). The frontend is verified by a clean `tsc --noEmit` and a successful production build. A full *manual* devnet click-through (real Phantom wallet, real RPC) was **not** executed in this environment — it requires a browser wallet. The create-flow blocker that would have broken that click-through is fixed; recommend BD/QA do one manual devnet run before any demo. See [Verification Evidence](#verification-evidence).

---

## What's Working Well

### Core Protocol (Solana Program)
- **4 instruction types** fully implemented: `create_stream`, `withdraw`, `cancel`, `release_milestone`
- **4 schedule types:** Linear, Cliff, Cliff+Linear, Milestone
- **3 cancel authority modes:** CreatorOnly, Either, Neither
- **Robust error handling:** 15 custom error codes, all arithmetic uses checked math (`checked_add`, `checked_sub`, `checked_mul`, `checked_div`), no `unwrap()` in production code
- **PDA security:** All accounts derived via deterministic seeds — stream configs, vaults, cannot be forged

### Frontend ("Velora")
- **Full-stack web app** built with Next.js 16, React 19, Tailwind CSS 4
- **Wallet integration:** Phantom wallet connect/disconnect, auto-reconnect on trusted sessions
- **Multi-step vesting creation wizard:** type selection → configuration → recipients → review
- **Dashboard:** Lists all streams where user is creator or recipient, with claimable amounts
- **Token faucet:** Built-in devnet faucet for testing
- **Contract explorer:** Per-stream detail page with live status
- **Help center / docs:** Built-in documentation pages
- **Analytics:** Page view tracking integrated

### Testing
- **17 Rust unit tests** — all passing
- **23 TypeScript integration tests** — all passing on localnet
- **Zero TypeScript compilation errors** across entire frontend
- **CI pipeline** runs on every push (Rust fmt, clippy, build, test)

### Devnet Deployment
- Program deployed to Solana devnet
- Program ID: `Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V`

---

## What's Not Working / Known Limitations

### On-Chain Program

| Issue | Severity | Status | Notes |
|---|---|---|---|
| `MultiSig` authority type not enforced | Medium | Known limitation | Currently only allows creator. Full multi-sig needs separate approval account pattern (Phase 3). |
| `ClaimReceipt` PDA not implemented | Medium | Deferred to Phase 3 | Per-withdrawal receipt accounts designed but not wired. Requires `claim_index` counter in StreamConfig. |
| `milestone_description` stored but not queryable | Low | Acceptable | 128-byte field stored on-chain but no instruction reads it back. Useful for off-chain indexing. |

### Frontend

| Issue | Severity | Status | Notes |
|---|---|---|---|
| No UI selectors for `cancelAuthority` | Medium | Known limitation | Hardcoded to `CreatorOnly` in the draft defaults. Users can't choose `Either` or `Neither` from the UI. |
| No UI selector for `authorityType` | Medium | Known limitation | Defaults to `None`. SingleKey/MultiSig not selectable. |
| No UI field for `cliffAmount` | Medium | Known limitation | Defaults to `0` and is not editable in the UI. Cliff+Linear streams always vest linearly from cliff (no lump sum). The `0` default no longer crashes creation (fixed — see Bugs Fixed #5). Exposing a real input is a Phase 3 item. |
| No frontend CI | Medium | Known limitation | Landing page has no TypeScript checking, linting, or tests in CI. |
| Public devnet RPC hardcoded | Low | Acceptable | Uses `https://api.devnet.solana.com` directly. Will hit rate limits under load. Supports env var override for faucet only. |
| Program ID duplicated (Rust + TS) | Low | Acceptable | Must be kept in sync manually if redeployed. |

### Documentation

| Issue | Status |
|---|---|
| Architecture doc "Known Gaps" section | Fixed — updated to reflect current state |
| README dev status table | Fixed — updated through Week 8 |
| README Rust version | Fixed — updated from 1.89.0 to 1.91.0 |
| README missing landing-page in repo structure | Fixed — added |

---

## Bugs Fixed This Week (Week 8)

### 1. `cliff_amount` unused in vesting math — **FIXED**

**Problem:** `CliffLinear` schedule stored `cliff_amount` but ignored it. All tokens were treated as linearly vesting from cliff to end. `Cliff` schedule incorrectly used linear vesting instead of unlocking all at cliff.

**Fix:**
- `Cliff` schedule now unlocks 100% at cliff timestamp (was: linear from cliff→end)
- `CliffLinear` schedule now unlocks `cliff_amount` at cliff + linear remainder from cliff→end (was: all linear)
- Added 3 new unit tests covering both schedule types with edge cases

**Files:** `backend/programs/backend/src/lib.rs`

### 2. `AuthorityType` stored but never enforced — **FIXED**

**Problem:** `AuthorityType` enum (None/SingleKey/MultiSig) was stored in `StreamConfig` but `release_milestone` ignored it — any authority could release regardless of type.

**Fix:** `release_milestone` now checks `authority_type`:
- `None`: only creator can release
- `SingleKey`: creator or release_authority can release
- `MultiSig`: creator only (simplification; full multi-sig deferred to Phase 3)

**Files:** `backend/programs/backend/src/lib.rs`

### 3. Hardcoded stream params in frontend — **FIXED**

**Problem:** `velora-chain.tsx` hardcoded `cancelAuthority: CreatorOnly`, `authorityType: None`, `cliffAmount: 0` — users couldn't configure these.

**Fix:**
- Added `cliffAmount`, `authorityType`, `releaseAuthority`, `cancelAuthority` to `CreateStreamInput` type
- Added `authorityTypeToAnchor()` and `cancelAuthorityToAnchor()` conversion helpers
- `createStream` now uses input values instead of hardcoded defaults
- Added `cliffAmount` to `StreamAccount` type and synced frontend `computeUnlocked()` with on-chain logic
- Added missing `CancellationDisabled` error code to IDL
- Removed debug `console.log` statements from production code
- Updated `VestingDraft` type with new fields and sensible defaults

**Files:** `landing-page/src/lib/velora-chain.tsx`, `landing-page/src/components/velora-prototype.tsx`

### 4. Dead `ClaimReceipt` code removed — **FIXED**

**Problem:** `ClaimReceipt` struct defined but never instantiated. Dead code behind `#[cfg(not(coverage))]`.

**Fix:** Removed struct and impl. Added comment noting it's planned for Phase 3.

**Files:** `backend/programs/backend/src/lib.rs`

### 5. `cliffAmount` default `"0"` crashed every stream creation — **FIXED** (release blocker)

**Problem:** The Week 8 commit that wired `cliffAmount` into the create flow used `parseRawAmount(draft.cliffAmount)` in the review-step submit handler. `parseRawAmount` throws `"Amount must be greater than zero."` on any value `<= 0`. Since `cliffAmount` defaults to `"0"` and has no UI input, **every** stream creation — Linear, Cliff, CliffLinear, Milestone — failed at the "Create Vesting" button with a misleading error, before any transaction was sent. The product could not create a stream end-to-end from the UI.

**Fix:**
- Added `parseRawAmountAllowZero()` to `velora-chain.tsx` — same digit validation, but `0` is a valid value (a CliffLinear stream with `cliffAmount=0` correctly vests linearly from the cliff).
- Submit handler now uses `parseRawAmountAllowZero(draft.cliffAmount)`.

**Files:** `landing-page/src/lib/velora-chain.tsx`, `landing-page/src/components/velora-prototype.tsx`

### 6. No on-chain guard that `cliff_amount <= total_amount` — **FIXED**

**Problem:** `create_stream` validated cliff *timestamp* but never validated the cliff *amount*. A `CliffLinear` stream created with `cliff_amount > total_amount` would store fine, then **underflow** at withdraw time (`total_amount - cliff_amount`), surfacing as a generic `MathOverflow` instead of a clear creation-time rejection. No funds were at risk (the underflow aborts the transaction), but the error was opaque and the bad stream was un-withdrawable.

**Fix:**
- Added `require!(cliff_amount <= total_amount, InvalidCliffAmount)` for `CliffLinear` in `create_stream`.
- Added error code `InvalidCliffAmount` (6014) to the program, the frontend IDL, and the error-humanizer map.
- Added a Rust unit test pinning the underlying underflow behavior.

> **Note:** this guard is additive and ships in the *source*. The program currently deployed to devnet predates it. The default flow (`cliffAmount=0`) is unaffected, so e2e is unblocked today; redeploy to devnet to activate the guard for custom cliff amounts.

**Files:** `backend/programs/backend/src/lib.rs`, `landing-page/src/lib/velora-chain.tsx`

---

## Verification Evidence

All commands run during this stabilization pass on June 12, 2026:

| Check | Command | Result |
|---|---|---|
| Rust unit tests | `cargo test` (program) | ✅ **18 passed**, 0 failed (was 17; +1 for cliff-amount overflow) |
| Integration tests | `anchor test` (local validator) | ✅ **23 passing** (~1m wall time) |
| Frontend type-check | `tsc --noEmit` (landing-page) | ✅ **0 errors** |
| Frontend build | `npm run build` (landing-page) | ✅ **Build succeeded**, 23 routes generated |
| Program lint | `cargo clippy --all-targets` | ✅ **Clean**, 0 warnings |

Integration tests exercise the full lifecycle against a real SPL token: create + lock in PDA vault, linear/cliff/milestone unlock, partial withdrawals, completion, cancel (before cliff / mid-stream / fully-vested / already-cancelled), and authority rejection (unauthorized withdraw/cancel, non-cancellable, `Neither`, `Either`). This is the strongest evidence the protocol works end-to-end; it runs on localnet rather than devnet but uses identical program logic.

---

## Performance Profile

### Program Metrics

| Metric | Value | Limit | Status |
|---|---|---|---|
| Program binary size | 316 KB | 400 KB | ✅ 79% used |
| StreamConfig account size | 359 bytes | 10 MB | ✅ Tiny |
| Custom error codes | 15 | — | ✅ Good coverage |
| Instruction count | 4 | — | ✅ Minimal |

### Transaction Performance (Localnet)

| Operation | Avg Time | Notes |
|---|---|---|
| Create stream | ~3.0s | Includes ATA creation + token transfer |
| Withdraw | ~3.8s | Includes ATA check + vault transfer |
| Cancel | ~3.8s | Two vault transfers (recipient + creator) |
| Release milestone | ~3.3s | Account update only, no token transfer |

*Note: Localnet times include validator overhead. Devnet times will be similar but with network latency.*

### Identified Bottlenecks

1. **`getProgramAccounts` for stream listing** — The frontend fetches ALL stream accounts, then filters client-side. This is O(n) RPC cost and will degrade with many streams. Mitigation: add an indexer or use Anchor's `memcmp` filters.

2. **Public devnet RPC rate limits** — Using `api.devnet.solana.com` directly. Under load, requests will be throttled. Mitigation: switch to a dedicated RPC provider (Helius, QuickNode).

3. **No transaction batching** — Each operation is a separate transaction. Creating multiple streams requires multiple wallet approvals. Mitigation: batch via versioned transactions in Phase 3.

---

## Test Coverage Summary

| Category | Count | Status |
|---|---|---|
| Rust unit tests | 18 | ✅ All passing |
| Integration tests (localnet) | 23 | ✅ All passing |
| TypeScript compilation | 0 errors | ✅ Clean |
| Frontend tests | 0 | ❌ Not implemented |

**Test categories covered:**
- Stream creation and token locking
- Linear vesting at 0%, 25%, 50%, 100%
- Cliff and Cliff+Linear schedules with cliff_amount
- Milestone release (valid + expired)
- Cancellation (before cliff, mid-stream, fully vested, already cancelled)
- Cancel authority enforcement (CreatorOnly, Either, Neither, non-cancellable)
- Unauthorized access rejection (attacker wallets)
- Edge cases (zero amount, cliff boundary, double withdrawal)
- Overflow safety (u64::MAX amounts)

---

## Recommendations for Phase 3

### High Priority
1. **ClaimReceipt PDA** — Per-withdrawal receipt accounts for audit trail. Requires `claim_index` in StreamConfig and a new instruction.
2. **Frontend UI for advanced params** — Add selectors for cancelAuthority, authorityType, cliffAmount. Currently accessible via API only.
3. **Frontend CI** — Add TypeScript type-check + ESLint to GitHub Actions for landing-page.
4. **Stream indexing** — Replace `getProgramAccounts` with an indexer (Helius, custom API) for scalable stream listing.

### Medium Priority
5. **Full MultiSig authority** — Implement proper multi-approval flow with a separate approval account.
6. **Batch operations** — Support creating multiple streams in one transaction.
7. **Program ID environment variable** — Remove hardcoded program ID duplication between Rust and TypeScript.
8. **Dedicated RPC provider** — Move from public devnet RPC to Helius/QuickNode for reliability.

### Low Priority
9. **Mainnet deployment guide** — Document the full mainnet deploy process with security checklist.
10. **SDK package** — Extract `velora-chain.tsx` into a standalone npm package for third-party integrators.
11. **Token-2022 support** — Extend to support SPL Token-2022 (confidential transfers, transfer hooks).
12. **Mobile-responsive audit** — Verify all pages work on mobile (partially done in Week 5 fix).

---

## For BD & Marketing

### What the Product Can Do
- Create token vesting streams on Solana with flexible schedules
- Support 4 schedule types: linear, cliff, cliff+linear, milestone
- Withdraw tokens as they vest (streaming claims)
- Cancel streams with configurable authority (creator-only, either party, neither)
- Runs on devnet with a polished Velora-branded web UI (wallet connect, dashboard, built-in test-token faucet)

### What the Product Can't Do (Yet)
- No multi-sig approval for milestone releases
- No per-withdrawal receipts (audit trail)
- No batch stream creation
- Advanced configuration (cancel authority, cliff lump-sum amounts, authority type) is wired through the SDK but has **no UI selectors** — defaults are used unless set in code
- Mainnet not deployed yet

### Honest caveat for demos
The blocking bug that stopped *any* stream from being created via the UI was fixed in this pass and the program is fully test-covered, **but** no human has yet clicked through the live devnet flow with a real wallet since the fix. **Before any live demo or public claim of "works on devnet," do one manual run:** connect Phantom → faucet test tokens → create a linear stream → see it on the dashboard → withdraw → cancel. Budget ~5 minutes. If that passes, the e2e claim is safe to make.

### Key Talking Points
- Built on Solana for speed and low cost (each operation ~3–4s incl. validator overhead; rent-cheap 359-byte stream accounts)
- Anchor framework ensures program security (deterministic PDA derivation, all-checked math, 15 custom error codes, no `unwrap()` in production paths)
- 41 automated test cases (18 Rust unit + 23 integration) covering happy paths, edge cases, authority enforcement, and overflow safety — all passing
- Polished Velora-branded frontend with wallet integration, dashboard, and analytics
- Program binary at ~79% of Solana's size limit — room for Phase 3 features

---

*Report generated by Team 5 engineering. Questions → Rangga or Axel.*
