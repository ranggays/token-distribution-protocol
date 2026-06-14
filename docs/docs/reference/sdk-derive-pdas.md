---
title: Deriving PDAs
sidebar_position: 3
description: Deterministic address derivation for stream_config, vault, and claim_receipt.
---

# Deriving PDAs

All Velora accounts use Program Derived Addresses (PDAs) for deterministic, client-side address derivation.

## Stream Config PDA

```typescript
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

function deriveStreamPDA(
  creator: PublicKey,
  streamId: BN,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("stream"),
      creator.toBuffer(),
      streamId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}
```

**Seeds**: `["stream", creator, stream_id (u64 LE)]`

The `stream_id` is a `u64` chosen by the creator. It's scoped to the creator, so two different creators can each have `stream_id = 1` without collision.

## Vault PDA

```typescript
function deriveVaultPDA(
  streamConfig: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), streamConfig.toBuffer()],
    programId
  );
}
```

**Seeds**: `["vault", stream_config]`

The vault is a PDA-owned token account. It's tied to exactly one stream via the `stream_config` address.

## Claim Receipt PDA

```typescript
function deriveClaimReceiptPDA(
  streamConfig: PublicKey,
  claimIndex: BN,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("claim"),
      streamConfig.toBuffer(),
      claimIndex.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}
```

**Seeds**: `["claim", stream_config, claim_index (u64 LE)]`

The `claim_index` is a monotonically incrementing counter stored in `StreamConfig`. Each withdrawal creates a new receipt with the next index.

## Why PDAs?

- **Deterministic**: client can compute addresses without scanning on-chain state
- **Unique**: seed design prevents collisions (creator-scoped stream IDs, stream-scoped vaults)
- **Signable by program**: the program can sign for PDA accounts in CPI calls (e.g., transferring tokens from the vault)

## Complete derivation example

```typescript
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const programId = new PublicKey("YOUR_PROGRAM_ID");
const creator = wallet.publicKey;
const streamId = new BN(1);

// Derive all three addresses
const [streamConfig, streamBump] = deriveStreamPDA(creator, streamId, programId);
const [vault, vaultBump] = deriveVaultPDA(streamConfig, programId);

// After first withdrawal, derive claim receipt
const [claimReceipt] = deriveClaimReceiptPDA(streamConfig, new BN(0), programId);

console.log("Stream Config:", streamConfig.toBase58());
console.log("Vault:", vault.toBase58());
console.log("Claim Receipt:", claimReceipt.toBase58());
```

:::tip
Cache the derived addresses. PDA derivation is deterministic — the same inputs always produce the same output. No need to re-derive on every call.
:::
