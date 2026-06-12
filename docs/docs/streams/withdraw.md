---
title: Withdrawing
sidebar_position: 2
description: Recipients claim unlocked tokens from a stream.
---

# Withdrawing

The `withdraw` instruction lets the recipient claim currently unlocked tokens from a stream.

## Instruction: `withdraw`

```rust
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()>
```

### Accounts

| Account | Signer | Writable | Description |
|---|---|---|---|
| `recipient` | Yes | Yes | Token recipient, must match `stream_config.recipient` |
| `stream_config` | No | Yes | Stream state account |
| `vault` | No | Yes | PDA token account holding locked tokens |
| `mint` | No | No | SPL token mint |
| `token_program` | No | No | SPL Token program |

### Behavior

1. Computes the currently unlocked amount based on `schedule_type`, current timestamp, and `amount_claimed`
2. If `claimable > 0`, CPIs a token transfer from vault to recipient
3. Updates `amount_claimed` on the `StreamConfig`
4. Creates a `ClaimReceipt` PDA recording the withdrawal
5. If all tokens are claimed, sets `status = Completed`

### Claim receipts

Each withdrawal creates a `ClaimReceipt` account:

```
seeds = ["claim", stream_config.key(), claim_index.to_le_bytes()]
```

This provides an on-chain record of every claim event and enables off-chain indexing.

## Example

```typescript
const [streamConfig] = deriveStreamPDA(creator, streamId, programId);
const [vault] = deriveVaultPDA(streamConfig, programId);

await program.methods
  .withdraw()
  .accounts({
    recipient: recipient.publicKey,
    streamConfig,
    vault,
    mint: mintAddress,
    tokenProgram: web3.TOKEN_PROGRAM_ID,
  })
  .signers([recipient])
  .rpc();
```

## Partial vs full withdrawal

- **Partial**: only the currently unlocked portion (minus previously claimed) is transferred
- **Full**: when all tokens are unlocked and withdrawn, the stream status changes to `Completed`

Multiple withdrawals are allowed. Each call claims whatever is newly unlocked since the last claim.

## Error conditions

| Condition | Error |
|---|---|
| Caller is not the recipient | `UnauthorizedRecipient` |
| No tokens are claimable | `NothingToClaim` |
| Stream is cancelled | `StreamCancelled` |
| Stream is already completed | `StreamCompleted` |
