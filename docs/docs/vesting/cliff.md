---
title: Cliff
sidebar_position: 3
description: All tokens unlock at a single timestamp.
---

# Cliff Vesting

All tokens unlock at once when the cliff timestamp is reached. Before the cliff, nothing is claimable.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `cliff_ts` | `i64` | Unix timestamp when all tokens unlock |
| `total_amount` | `u64` | Total tokens locked in the stream |

:::info
For cliff vesting, `end_ts` is ignored. Only `cliff_ts` matters.
:::

## Unlock formula

```
claimable = total_amount   if now >= cliff_ts
          = 0              otherwise
```

This is a one-shot release. Once the cliff is reached, the full amount becomes available.

## Example

Lock 5,000 tokens with a 90-day cliff:

```typescript
const now = Math.floor(Date.now() / 1000);

await program.methods
  .createStream({
    streamId: new BN(2),
    recipient: recipient.publicKey,
    totalAmount: new BN(5_000_000_000_000), // 5000 tokens
    scheduleType: { cliff: {} },
    startTs: new BN(now),
    endTs: new BN(now + 86400 * 90), // cliff_ts derived from this
    cliffTs: new BN(now + 86400 * 90),
    isCancellable: false,
    cancelAuthority: { neither: {} },
  })
  // ... accounts and signers
  .rpc();
```

## Behavior on cancel

If the stream is cancellable and cancelled before the cliff, no tokens are claimable. All tokens return to the creator. After the cliff, the full amount is already unlocked.
