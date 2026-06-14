---
title: Quick Start
sidebar_position: 3
description: Deploy to devnet and create your first token stream.
---

# Quick Start

Deploy the Velora program to Solana devnet and create a token stream in under five minutes.

## 1. Configure for devnet

```bash
solana config set --url devnet
solana airdrop 2
```

The airdrop gives you 2 SOL for transaction fees. If it fails (rate-limited), try again or use the [Solana Faucet](https://faucet.solana.com/).

## 2. Build and deploy

```bash
cd token-distribution-protocol/backend
anchor build
anchor deploy --provider.cluster devnet
```

Note the program ID from the deploy output. You'll need it for client-side calls.

## 3. Create a stream (TypeScript)

```typescript
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Load the program
const program = new Program(idl, provider);

// Derive the stream_config PDA
const streamId = new BN(1);
const [streamConfig] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("stream"),
    creator.publicKey.toBuffer(),
    streamId.toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

// Derive the vault PDA
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), streamConfig.toBuffer()],
  program.programId
);

// Create the stream
await program.methods
  .createStream({
    streamId,
    recipient: recipient.publicKey,
    totalAmount: new BN(1_000_000_000), // 1 token (9 decimals)
    scheduleType: { linear: {} },
    startTs: new BN(Math.floor(Date.now() / 1000)),
    endTs: new BN(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days
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

## 4. Check stream state

```typescript
const stream = await program.account.streamConfig.fetch(streamConfig);
console.log("Status:", stream.status);
console.log("Total:", stream.totalAmount.toString());
console.log("Claimed:", stream.amountClaimed.toString());
```

## 5. Withdraw (as recipient)

```typescript
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

## Next steps

- [Vesting Schedules](./vesting/overview) — explore all four schedule types
- [SDK Reference](./reference/sdk-overview) — full TypeScript API
- [Architecture](./architecture) — PDA design and token flow
