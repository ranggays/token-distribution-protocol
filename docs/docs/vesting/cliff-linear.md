---
title: Cliff + Linear
sidebar_position: 4
description: Lump sum at cliff, then continuous streaming.
---

# Cliff + Linear Vesting

A lump sum unlocks at the cliff timestamp, then the remaining tokens stream linearly from cliff to end. Combines the immediacy of cliff vesting with the gradual release of linear vesting.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `cliff_ts` | `i64` | Unix timestamp when the cliff portion unlocks |
| `cliff_amount` | `u64` | Tokens released at the cliff |
| `end_ts` | `i64` | Unix timestamp when streaming ends |
| `total_amount` | `u64` | Total tokens locked (includes cliff_amount) |

## Unlock formula

```
cliff_portion  = cliff_amount                          (released at cliff_ts)
linear_portion = total_amount - cliff_amount           (streams from cliff_ts to end_ts)

unlocked = cliff_amount + linear_portion * (now - cliff_ts) / (end_ts - cliff_ts)
claimable = unlocked - amount_claimed
```

Boundary conditions:
- `now < cliff_ts` → `unlocked = 0`
- `now >= cliff_ts` and `now < end_ts` → cliff + partial linear
- `now >= end_ts` → `unlocked = total_amount`

## Example

Lock 10,000 tokens. 2,000 at cliff (day 30), remaining 8,000 stream over next 60 days:

```typescript
const now = Math.floor(Date.now() / 1000);
const cliffTs = now + 86400 * 30;
const endTs = cliffTs + 86400 * 60;

await program.methods
  .createStream({
    streamId: new BN(3),
    recipient: recipient.publicKey,
    totalAmount: new BN(10_000_000_000_000),
    scheduleType: { cliffLinear: {} },
    startTs: new BN(now),
    endTs: new BN(endTs),
    cliffTs: new BN(cliffTs),
    cliffAmount: new BN(2_000_000_000_000),
    isCancellable: true,
    cancelAuthority: { either: {} },
  })
  // ... accounts and signers
  .rpc();
```

Timeline:
- Day 0–29: 0 tokens claimable
- Day 30: 2,000 tokens claimable (cliff)
- Day 30–90: 8,000 tokens stream linearly
- Day 90+: all 10,000 tokens claimable

## Behavior on cancel

If cancelled after the cliff but before end: the recipient can claim the cliff amount plus whatever has linearly unlocked up to the cancellation point. Remaining tokens return to the creator.
