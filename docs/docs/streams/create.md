---
title: Creating Streams
sidebar_position: 1
description: Lock tokens into a vesting stream with configurable parameters.
---

# Creating Streams

The `create_stream` instruction locks tokens into a program-controlled vault and initializes a `StreamConfig` account with the vesting parameters.

## Instruction: `create_stream`

```rust
pub fn create_stream(ctx: Context<CreateStream>, params: CreateStreamParams) -> Result<()>
```

### Parameters

| Field | Type | Description |
|---|---|---|
| `stream_id` | `u64` | Creator-scoped ID for PDA derivation |
| `recipient` | `Pubkey` | Token recipient |
| `total_amount` | `u64` | Tokens to lock |
| `schedule_type` | `ScheduleType` | Linear, Cliff, CliffLinear, or Milestone |
| `start_ts` | `i64` | Vesting start timestamp |
| `end_ts` | `i64` | Vesting end timestamp |
| `cliff_ts` | `i64` | Cliff timestamp (Cliff, CliffLinear only) |
| `cliff_amount` | `u64` | Cliff portion (CliffLinear only) |
| `authority_type` | `AuthorityType` | None, SingleKey, or MultiSig |
| `release_authority` | `Pubkey` | Milestone release signer |
| `is_cancellable` | `bool` | Whether the stream can be cancelled |
| `cancel_authority` | `CancelAuthority` | CreatorOnly, Either, or Neither |

### Accounts

| Account | Signer | Writable | Description |
|---|---|---|---|
| `creator` | Yes | Yes | Pays for account creation, token source |
| `stream_config` | No | Yes | PDA: `["stream", creator, stream_id]` |
| `vault` | No | Yes | PDA token account: `["vault", stream_config]` |
| `mint` | No | No | SPL token mint |
| `token_program` | No | No | SPL Token program |
| `system_program` | No | No | System program |

## Token transfer

On creation, the program CPIs a token transfer from the creator's token account to the vault PDA. The creator must have sufficient balance and the token account must be initialized for the correct mint.

## Account creation

The `stream_config` account is created with `init` and allocated using `StreamConfig::SPACE` (derived from `InitSpace`). The vault is created as a PDA-owned token account.

## Example

```typescript
import { BN } from "@coral-xyz/anchor";

const streamId = new BN(1);
const [streamConfig] = deriveStreamPDA(creator.publicKey, streamId, programId);
const [vault] = deriveVaultPDA(streamConfig, programId);

await program.methods
  .createStream({
    streamId,
    recipient: recipient.publicKey,
    totalAmount: new BN(1_000_000_000),
    scheduleType: { linear: {} },
    startTs: new BN(Math.floor(Date.now() / 1000)),
    endTs: new BN(Math.floor(Date.now() / 1000) + 86400 * 30),
    cliffTs: new BN(0),
    cliffAmount: new BN(0),
    authorityType: { none: {} },
    releaseAuthority: web3.PublicKey.default,
    isCancellable: true,
    cancelAuthority: { creatorOnly: {} },
  })
  .accounts({
    creator: creator.publicKey,
    streamConfig,
    vault,
    mint: mintAddress,
    tokenProgram: web3.TOKEN_PROGRAM_ID,
    systemProgram: web3.SystemProgram.programId,
  })
  .signers([creator])
  .rpc();
```
