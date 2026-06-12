---
title: Linear
sidebar_position: 2
description: Continuous token unlock from start to end timestamp.
---

# Linear Vesting

Tokens unlock continuously from `start_ts` to `end_ts`. The unlocked amount increases proportionally with time.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `start_ts` | `i64` | Unix timestamp when vesting begins |
| `end_ts` | `i64` | Unix timestamp when 100% is unlocked |
| `total_amount` | `u64` | Total tokens locked in the stream |

## Unlock formula

```
unlocked = total_amount * (now - start_ts) / (end_ts - start_ts)
claimable = unlocked - amount_claimed
```

Boundary conditions:
- `now < start_ts` → `unlocked = 0`
- `now > end_ts` → `unlocked = total_amount`

## Example

Lock 1,000 tokens, linear release over 30 days:

```typescript
const now = Math.floor(Date.now() / 1000);

await program.methods
  .createStream({
    streamId: new BN(1),
    recipient: recipient.publicKey,
    totalAmount: new BN(1_000_000_000_000), // 1000 tokens
    scheduleType: { linear: {} },
    startTs: new BN(now),
    endTs: new BN(now + 86400 * 30),
    isCancellable: true,
    cancelAuthority: { creatorOnly: {} },
  })
  // ... accounts and signers
  .rpc();
```

After 15 days, 500 tokens are unlocked. After 30 days, all 1,000 are unlocked.

## Behavior on cancel

If the stream is cancelled mid-vesting, the recipient can claim whatever has been unlocked up to the cancellation timestamp. The remaining tokens return to the creator.
