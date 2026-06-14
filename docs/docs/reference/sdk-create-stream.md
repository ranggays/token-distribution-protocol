---
title: SDK — Create Stream
sidebar_position: 4
description: Build and send create_stream transactions.
---

# SDK — Create Stream

Build a `create_stream` instruction with the SDK.

## Full example

```typescript
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

async function createStream(
  program: Program,
  creator: web3.Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  params: {
    streamId: BN;
    totalAmount: BN;
    scheduleType: object;
    startTs: BN;
    endTs: BN;
    cliffTs?: BN;
    cliffAmount?: BN;
    authorityType?: object;
    releaseAuthority?: PublicKey;
    isCancellable: boolean;
    cancelAuthority: object;
  }
) {
  const [streamConfig] = deriveStreamPDA(
    creator.publicKey,
    params.streamId,
    program.programId
  );

  const [vault] = deriveVaultPDA(streamConfig, program.programId);

  const tx = await program.methods
    .createStream({
      streamId: params.streamId,
      recipient,
      totalAmount: params.totalAmount,
      scheduleType: params.scheduleType,
      startTs: params.startTs,
      endTs: params.endTs,
      cliffTs: params.cliffTs ?? new BN(0),
      cliffAmount: params.cliffAmount ?? new BN(0),
      authorityType: params.authorityType ?? { none: {} },
      releaseAuthority: params.releaseAuthority ?? PublicKey.default,
      isCancellable: params.isCancellable,
      cancelAuthority: params.cancelAuthority,
    })
    .accounts({
      creator: creator.publicKey,
      streamConfig,
      vault,
      mint,
      tokenProgram: web3.TOKEN_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([creator])
    .rpc();

  return { tx, streamConfig, vault };
}
```

## Usage examples

### Linear vesting

```typescript
const now = Math.floor(Date.now() / 1000);
const { streamConfig } = await createStream(program, creator, recipient, mint, {
  streamId: new BN(1),
  totalAmount: new BN(1_000_000_000),
  scheduleType: { linear: {} },
  startTs: new BN(now),
  endTs: new BN(now + 86400 * 30),
  isCancellable: true,
  cancelAuthority: { creatorOnly: {} },
});
```

### Cliff vesting

```typescript
const { streamConfig } = await createStream(program, creator, recipient, mint, {
  streamId: new BN(2),
  totalAmount: new BN(5_000_000_000),
  scheduleType: { cliff: {} },
  startTs: new BN(now),
  endTs: new BN(now + 86400 * 90),
  cliffTs: new BN(now + 86400 * 90),
  isCancellable: false,
  cancelAuthority: { neither: {} },
});
```

### Milestone with multisig

```typescript
const { streamConfig } = await createStream(program, creator, recipient, mint, {
  streamId: new BN(3),
  totalAmount: new BN(50_000_000_000),
  scheduleType: { milestone: {} },
  startTs: new BN(now),
  endTs: new BN(0),
  authorityType: { multiSig: {} },
  releaseAuthority: squadsMultisigAddress,
  isCancellable: true,
  cancelAuthority: { creatorOnly: {} },
});
```

## Error handling

```typescript
try {
  const { tx } = await createStream(program, creator, recipient, mint, params);
  console.log("Stream created:", tx);
} catch (err) {
  if (err.error?.errorCode?.code === "InsufficientBalance") {
    console.error("Creator doesn't have enough tokens");
  } else {
    console.error("Transaction failed:", err);
  }
}
```
