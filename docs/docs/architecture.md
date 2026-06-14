---
title: Architecture
sidebar_position: 9
description: PDA design, token flow, schedule logic, and authority model.
---

# Architecture — Token Distribution Protocol

This document covers the on-chain design decisions for the protocol: account layout, PDA derivation, token flow, and authority model.

---

## Accounts Overview

The protocol uses two on-chain account types.

### `StreamConfig` — one per stream

The primary state account. Stores everything needed to validate and execute a withdrawal or cancellation: who the parties are, how much has been claimed, the schedule parameters, and the authority rules.

Allocated once at stream creation, never resized. The `reserved: [u8; 30]` field leaves room to add fields in future versions without changing the account address.

### `ClaimReceipt` — one per withdrawal

Created at each successful withdrawal call to record the event. Useful for indexing claim history off-chain and for idempotency checks (prevents double-claiming within the same epoch in future implementations).

---

## PDA Derivation

> **Status:** seeds are not yet wired in the Week 3 scaffold. This section documents the intended design for Week 4 implementation.

### `stream_config`

```
seeds = [
    b"stream",
    creator.key().as_ref(),
    stream_id.to_le_bytes().as_ref(),
]
bump = stream_config.bump
```

`stream_id` is a `u64` chosen by the creator and passed in `CreateStreamParams`. Using a creator-scoped numeric ID means:
- The same creator can open multiple streams for the same recipient/mint pair
- The client can derive the address deterministically without scanning on-chain state
- IDs are not global — two creators can each have `stream_id = 1`

### `vault`

```
seeds = [
    b"vault",
    stream_config.key().as_ref(),
]
bump = stream_config.vault_bump
```

The vault is a PDA-owned token account (or native SOL account for wrapped SOL). Anchoring the vault to `stream_config`'s address ties it unambiguously to one stream.

The vault bump is stored in `StreamConfig.vault_bump` so it can be reconstructed as a signer for CPI calls without being passed by the client.

### `claim_receipt`

```
seeds = [
    b"claim",
    stream_config.key().as_ref(),
    claim_index.to_le_bytes().as_ref(),
]
```

`claim_index` is a monotonically incrementing counter stored in `StreamConfig` (to be added in Week 4). This makes each receipt address unique and predictable.

---

## Token Flow

```
Creator
  │
  │  create_stream
  │  ─────────────────────────────────────────────────►  StreamConfig PDA
  │                                                        vault PDA
  │
  │  [creator transfers total_amount to vault via CPI]
  │  ─────────────────────────────────────────────────►  vault (token account)
  │
  │
Recipient
  │
  │  withdraw
  │  ─────────────────────────────────────────────────►  compute unlocked amount
  │                                                          │
  │  [program CPIs token transfer: vault → recipient]  ◄────┘
  │
  │  [ClaimReceipt PDA created]
  │
  │
Creator (or cancel_authority)
  │
  │  cancel  (only if is_cancellable = true)
  │  ─────────────────────────────────────────────────►  StreamConfig.status = Cancelled
  │  [unclaimed tokens returned: vault → creator]
```

---

## Schedule Logic

### Linear

```
unlocked = total_amount * (now - start_ts) / (end_ts - start_ts)
claimable = unlocked - amount_claimed
```

Clamped: `now < start_ts` → `0`, `now > end_ts` → `total_amount`.

### Cliff

```
claimable = total_amount  if now >= cliff_ts
          = 0             otherwise
```

One-shot release. `end_ts` is ignored.

### Cliff + Linear

```
cliff portion   = cliff_amount             (released at cliff_ts)
linear portion  = total_amount - cliff_amount
                  released linearly from cliff_ts to end_ts

unlocked = cliff_amount + linear_portion * (now - cliff_ts) / (end_ts - cliff_ts)
claimable = unlocked - amount_claimed
```

### Milestone

```
claimable = total_amount  if milestone_released = true
          = 0             otherwise
```

`release_authority` signs a dedicated instruction (to be added) that flips `milestone_released`. Authority is validated via `authority_type`:

| `AuthorityType` | Meaning |
|---|---|
| `None` | No release authority — milestone cannot be released |
| `SingleKey` | `release_authority` field holds the signer pubkey |
| `MultiSig` | `release_authority` holds a multisig program address (e.g. Squads) |

---

## Cancel Authority Model

`is_cancellable` and `cancel_authority` are set at creation and immutable.

| `CancelAuthority` | Who can call `cancel` |
|---|---|
| `CreatorOnly` | Only the original creator |
| `Either` | Creator or recipient |
| `Neither` | No one — stream runs to completion regardless |

When `is_cancellable = false`, all cancel attempts are rejected unconditionally regardless of `cancel_authority`.

---

## Space Budget

`StreamConfig::SPACE` uses `#[derive(InitSpace)]` to compute the exact byte count at compile time, so manual counting errors can't cause under-allocated accounts. The `reserved: [u8; 30]` field is intentionally included in the space budget to allow adding new fields later without reallocating the account.

`ClaimReceipt::SPACE` is similarly derived from `InitSpace`.

---

## Known Gaps (Week 4+)

- PDA seeds and `init` constraint not yet wired in the Anchor contexts
- `anchor-spl` not yet added as a dependency (needed for token CPI)
- `token_program` and `associated_token_program` not yet in `Withdraw`/`CancelStream` contexts
- `claim_index` counter not yet in `StreamConfig` (needed for `ClaimReceipt` PDA)
- Milestone release instruction not yet defined
