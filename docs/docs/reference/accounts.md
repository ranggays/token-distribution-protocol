---
title: Account Reference
sidebar_position: 7
description: On-chain account layouts and space budgets.
---

# Account Reference

Velora uses two on-chain account types, both derived from `InitSpace` for compile-time size calculation.

## StreamConfig

The primary state account. One per stream.

| Field | Size (bytes) | Type |
|---|---|---|
| `creator` | 32 | `Pubkey` |
| `recipient` | 32 | `Pubkey` |
| `mint` | 32 | `Pubkey` |
| `vault` | 32 | `Pubkey` |
| `vault_bump` | 1 | `u8` |
| `stream_id` | 8 | `u64` |
| `total_amount` | 8 | `u64` |
| `amount_claimed` | 8 | `u64` |
| `start_ts` | 8 | `i64` |
| `end_ts` | 8 | `i64` |
| `cliff_ts` | 8 | `i64` |
| `cliff_amount` | 8 | `u64` |
| `schedule_type` | 1 | `ScheduleType` enum |
| `authority_type` | 1 | `AuthorityType` enum |
| `release_authority` | 32 | `Pubkey` |
| `is_cancellable` | 1 | `bool` |
| `cancel_authority` | 1 | `CancelAuthority` enum |
| `status` | 1 | `StreamStatus` enum |
| `reserved` | 30 | `[u8; 30]` |
| **Discriminator** | 8 | Anchor account discriminator |
| **Total** | **~231** | + 8 discriminator |

:::info
Space is computed at compile time via `#[derive(InitSpace)]`. The `reserved` field is intentionally oversized to allow future protocol upgrades without account reallocation.
:::

## ClaimReceipt

Created on each withdrawal. One per claim event.

| Field | Size (bytes) | Type |
|---|---|---|
| `stream_config` | 32 | `Pubkey` |
| `claim_index` | 8 | `u64` |
| `amount` | 8 | `u64` |
| `timestamp` | 8 | `i64` |
| **Discriminator** | 8 | Anchor account discriminator |
| **Total** | **~64** | |

### PDA derivation

```
seeds = ["claim", stream_config.key(), claim_index.to_le_bytes()]
```

The `claim_index` is a monotonically incrementing counter in `StreamConfig`. Each withdrawal increments it and uses the new value for the receipt PDA.

## Rent exemption

Both accounts are rent-exempt. The creator pays for account creation at `create_stream` time. Rent cost is proportional to account size:

- **StreamConfig**: ~0.002 SOL
- **ClaimReceipt**: ~0.001 SOL

These are one-time costs paid by the creator.
