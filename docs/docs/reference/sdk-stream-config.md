---
title: StreamConfig Account
sidebar_position: 2
description: Type definitions and field layout for the StreamConfig account.
---

# StreamConfig Account

The `StreamConfig` account stores all state for a single vesting stream. Created once at `create_stream` and updated on each `withdraw` or `cancel`.

## Account layout

```rust
#[account]
#[derive(InitSpace)]
pub struct StreamConfig {
    pub creator: Pubkey,           // 32 bytes
    pub recipient: Pubkey,         // 32 bytes
    pub mint: Pubkey,              // 32 bytes
    pub vault: Pubkey,             // 32 bytes
    pub vault_bump: u8,            // 1 byte
    pub stream_id: u64,            // 8 bytes
    pub total_amount: u64,         // 8 bytes
    pub amount_claimed: u64,       // 8 bytes
    pub start_ts: i64,             // 8 bytes
    pub end_ts: i64,               // 8 bytes
    pub cliff_ts: i64,             // 8 bytes
    pub cliff_amount: u64,         // 8 bytes
    pub schedule_type: ScheduleType, // 1 byte (enum)
    pub authority_type: AuthorityType, // 1 byte
    pub release_authority: Pubkey, // 32 bytes
    pub is_cancellable: bool,      // 1 byte
    pub cancel_authority: CancelAuthority, // 1 byte
    pub status: StreamStatus,      // 1 byte
    pub reserved: [u8; 30],        // 30 bytes (future upgrades)
}
```

## Field descriptions

| Field | Type | Description |
|---|---|---|
| `creator` | `Pubkey` | Address that created the stream and funded the vault |
| `recipient` | `Pubkey` | Address that can withdraw unlocked tokens |
| `mint` | `Pubkey` | SPL token mint for the stream |
| `vault` | `Pubkey` | PDA token account holding locked tokens |
| `vault_bump` | `u8` | Bump seed for vault PDA (stored for CPI signer reconstruction) |
| `stream_id` | `u64` | Creator-scoped stream identifier |
| `total_amount` | `u64` | Total tokens locked at creation |
| `amount_claimed` | `u64` | Cumulative tokens withdrawn so far |
| `start_ts` | `i64` | Vesting start timestamp (unix) |
| `end_ts` | `i64` | Vesting end timestamp (unix) |
| `cliff_ts` | `i64` | Cliff timestamp (used by Cliff, CliffLinear) |
| `cliff_amount` | `u64` | Cliff portion (used by CliffLinear) |
| `schedule_type` | `ScheduleType` | Linear, Cliff, CliffLinear, or Milestone |
| `authority_type` | `AuthorityType` | None, SingleKey, or MultiSig |
| `release_authority` | `Pubkey` | Address that can trigger milestone release |
| `is_cancellable` | `bool` | Master switch for cancellation |
| `cancel_authority` | `CancelAuthority` | Who can cancel (CreatorOnly, Either, Neither) |
| `status` | `StreamStatus` | Active, Cancelled, or Completed |
| `reserved` | `[u8; 30]` | Reserved bytes for future protocol upgrades |

## Enums

### `ScheduleType`

```rust
pub enum ScheduleType {
    Linear,      // 0
    Cliff,       // 1
    CliffLinear, // 2
    Milestone,   // 3
}
```

### `AuthorityType`

```rust
pub enum AuthorityType {
    None,     // 0
    SingleKey, // 1
    MultiSig,  // 2
}
```

### `CancelAuthority`

```rust
pub enum CancelAuthority {
    CreatorOnly, // 0
    Either,      // 1
    Neither,     // 2
}
```

### `StreamStatus`

```rust
pub enum StreamStatus {
    Active,    // 0
    Cancelled, // 1
    Completed, // 2
}
```

## Fetching in TypeScript

```typescript
const stream = await program.account.streamConfig.fetch(streamConfigPDA);

console.log("Creator:", stream.creator.toBase58());
console.log("Recipient:", stream.recipient.toBase58());
console.log("Total:", stream.totalAmount.toString());
console.log("Claimed:", stream.amountClaimed.toString());
console.log("Status:", stream.status);
```

## Reserved field

The `reserved: [u8; 30]` field is intentionally included in the space budget. It allows adding new fields in future protocol versions without reallocating the account (which would require a migration). Future fields will be written into this reserved space.
