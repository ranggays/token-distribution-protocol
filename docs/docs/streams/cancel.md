---
title: Cancelling
sidebar_position: 3
description: Cancel a stream and return unclaimed tokens to the creator.
---

# Cancelling

The `cancel` instruction stops a stream and returns unclaimed tokens to the creator. The recipient can still claim whatever was unlocked before cancellation.

## Instruction: `cancel`

```rust
pub fn cancel(ctx: Context<CancelStream>) -> Result<()>
```

### Accounts

| Account | Signer | Writable | Description |
|---|---|---|---|
| `authority` | Yes | Yes | Creator or recipient (depending on `cancel_authority`) |
| `stream_config` | No | Yes | Stream state account |
| `vault` | No | Yes | PDA token account |
| `mint` | No | No | SPL token mint |
| `token_program` | No | No | SPL Token program |

### Behavior

1. Validates the caller against `cancel_authority` and `is_cancellable`
2. Computes unlocked amount at cancellation timestamp
3. Transfers unlocked (but unclaimed) tokens to recipient
4. Transfers remaining tokens from vault to creator
5. Sets `stream_config.status = Cancelled`

## Cancellation rules

The `is_cancellable` flag is checked first. If `false`, all cancel attempts are rejected regardless of `cancel_authority`.

| `CancelAuthority` | Who can call `cancel` |
|---|---|
| `CreatorOnly` | Only the original creator |
| `Either` | Creator or recipient |
| `Neither` | No one — stream runs to completion |

## Example

```typescript
await program.methods
  .cancel()
  .accounts({
    authority: creator.publicKey,
    streamConfig,
    vault,
    mint: mintAddress,
    tokenProgram: web3.TOKEN_PROGRAM_ID,
  })
  .signers([creator])
  .rpc();
```

## Error conditions

| Condition | Error |
|---|---|
| Stream is not cancellable | `StreamNotCancellable` |
| Caller lacks cancel authority | `UnauthorizedCancel` |
| Stream already cancelled | `StreamCancelled` |
| Stream already completed | `StreamCompleted` |

## Token flow on cancel

```
Vault (remaining tokens)
  ├── unlocked & unclaimed ──► Recipient
  └── locked (remainder) ──► Creator
```
