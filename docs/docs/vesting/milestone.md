---
title: Milestone
sidebar_position: 5
description: Manual release triggered by a designated authority.
---

# Milestone Vesting

Tokens remain locked until a designated release authority triggers the unlock. Unlike time-based schedules, milestone vesting requires human action.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `total_amount` | `u64` | Total tokens locked in the stream |
| `authority_type` | `AuthorityType` | Who can trigger the release |
| `release_authority` | `Pubkey` | Public key (or multisig) that signs the release |

## Authority types

| `AuthorityType` | Behavior |
|---|---|
| `None` | No release authority. Tokens can never be released. Useful for burn-like escrow. |
| `SingleKey` | `release_authority` holds a single signer pubkey. |
| `MultiSig` | `release_authority` holds a multisig program address (e.g. Squads). Multiple signers required. |

## Unlock formula

```
claimable = total_amount   if milestone_released = true
          = 0              otherwise
```

The `milestone_released` flag is flipped by the `release_milestone` instruction, which validates the signer against `release_authority` and `authority_type`.

## Example

Lock 50,000 tokens. Released when the grant committee (3-of-5 multisig) approves:

```typescript
const squadsMultisig = new PublicKey("SQDSx...");

await program.methods
  .createStream({
    streamId: new BN(4),
    recipient: recipient.publicKey,
    totalAmount: new BN(50_000_000_000_000),
    scheduleType: { milestone: {} },
    startTs: new BN(Math.floor(Date.now() / 1000)),
    endTs: new BN(0), // unused for milestone
    authorityType: { multiSig: {} },
    releaseAuthority: squadsMultisig,
    isCancellable: true,
    cancelAuthority: { creatorOnly: {} },
  })
  // ... accounts and signers
  .rpc();
```

## Releasing a milestone

The release authority calls `release_milestone`:

```typescript
await program.methods
  .releaseMilestone()
  .accounts({
    releaseAuthority: authority.publicKey,
    streamConfig,
  })
  .signers([authority])
  .rpc();
```

After release, the recipient can withdraw the full amount via `withdraw`.

## Behavior on cancel

If the stream is cancelled before the milestone is released, all tokens return to the creator. After release, the recipient can claim everything.
