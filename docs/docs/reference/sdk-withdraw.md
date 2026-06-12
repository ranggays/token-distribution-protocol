---
title: SDK — Withdraw
sidebar_position: 5
description: Build and send withdraw transactions.
---

# SDK — Withdraw

Build a `withdraw` instruction to claim unlocked tokens from a stream.

## Function

```typescript
async function withdraw(
  program: Program,
  recipient: web3.Keypair,
  streamConfig: PublicKey,
  mint: PublicKey
) {
  const [vault] = deriveVaultPDA(streamConfig, program.programId);

  const tx = await program.methods
    .withdraw()
    .accounts({
      recipient: recipient.publicKey,
      streamConfig,
      vault,
      mint,
      tokenProgram: web3.TOKEN_PROGRAM_ID,
    })
    .signers([recipient])
    .rpc();

  return tx;
}
```

## Usage

```typescript
const tx = await withdraw(program, recipient, streamConfigPDA, mintAddress);
console.log("Withdrawal tx:", tx);
```

## Checking claimable amount

Before calling withdraw, you can compute the claimable amount client-side:

```typescript
import { BN } from "@coral-xyz/anchor";

function computeClaimable(stream: any): BN {
  const now = Math.floor(Date.now() / 1000);
  let unlocked = new BN(0);

  const scheduleType = Object.keys(stream.scheduleType)[0];

  if (scheduleType === "linear") {
    if (now < stream.startTs.toNumber()) {
      unlocked = new BN(0);
    } else if (now >= stream.endTs.toNumber()) {
      unlocked = stream.totalAmount;
    } else {
      const elapsed = now - stream.startTs.toNumber();
      const duration = stream.endTs.toNumber() - stream.startTs.toNumber();
      unlocked = stream.totalAmount.mul(new BN(elapsed)).div(new BN(duration));
    }
  } else if (scheduleType === "cliff") {
    if (now >= stream.cliffTs.toNumber()) {
      unlocked = stream.totalAmount;
    }
  } else if (scheduleType === "cliffLinear") {
    if (now >= stream.endTs.toNumber()) {
      unlocked = stream.totalAmount;
    } else if (now >= stream.cliffTs.toNumber()) {
      const elapsed = now - stream.cliffTs.toNumber();
      const duration = stream.endTs.toNumber() - stream.cliffTs.toNumber();
      const linear = stream.totalAmount
        .sub(stream.cliffAmount)
        .mul(new BN(elapsed))
        .div(new BN(duration));
      unlocked = stream.cliffAmount.add(linear);
    }
  }
  // milestone: check stream.status or milestone_released flag

  const claimable = unlocked.sub(stream.amountClaimed);
  return claimable.gtn(0) ? claimable : new BN(0);
}
```

## Multiple withdrawals

You can call `withdraw` multiple times. Each call transfers whatever is newly unlocked since the last claim. The `amount_claimed` field is updated on each call.

## Claim receipts

Each withdrawal creates a `ClaimReceipt` PDA. The receipt records the withdrawal amount and timestamp. Use the claim receipt PDA to verify past claims:

```typescript
const claimIndex = new BN(0); // first claim
const [receipt] = deriveClaimReceiptPDA(streamConfigPDA, claimIndex, program.programId);
const receiptData = await program.account.claimReceipt.fetch(receipt);
console.log("Claimed at:", receiptData.timestamp.toString());
console.log("Amount:", receiptData.amount.toString());
```
