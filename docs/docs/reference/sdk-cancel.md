---
title: SDK — Cancel
sidebar_position: 6
description: Build and send cancel transactions.
---

# SDK — Cancel

Build a `cancel` instruction to stop a stream and return unclaimed tokens.

## Function

```typescript
async function cancel(
  program: Program,
  authority: web3.Keypair,
  streamConfig: PublicKey,
  mint: PublicKey
) {
  const [vault] = deriveVaultPDA(streamConfig, program.programId);

  const tx = await program.methods
    .cancel()
    .accounts({
      authority: authority.publicKey,
      streamConfig,
      vault,
      mint,
      tokenProgram: web3.TOKEN_PROGRAM_ID,
    })
    .signers([authority])
    .rpc();

  return tx;
}
```

## Usage

```typescript
// Creator cancels
const tx = await cancel(program, creator, streamConfigPDA, mintAddress);
console.log("Cancel tx:", tx);
```

## Who can cancel?

Pass the correct signer based on the stream's `cancel_authority`:

```typescript
const stream = await program.account.streamConfig.fetch(streamConfigPDA);
const cancelAuth = Object.keys(stream.cancelAuthority)[0];

if (!stream.isCancellable) {
  console.error("Stream is not cancellable");
} else if (cancelAuth === "creatorOnly") {
  await cancel(program, creator, streamConfigPDA, mint);
} else if (cancelAuth === "either") {
  // Either creator or recipient can sign
  await cancel(program, signer, streamConfigPDA, mint);
}
```

## Token flow after cancel

After cancellation:
- Recipient can claim whatever was unlocked up to the cancellation timestamp
- Remaining (locked) tokens return to the creator
- Stream status is set to `Cancelled`
- No further `withdraw` or `cancel` calls are accepted

## Error codes

| Code | Meaning |
|---|---|
| `StreamNotCancellable` | `is_cancellable` is `false` |
| `UnauthorizedCancel` | Signer doesn't match `cancel_authority` |
| `StreamCancelled` | Already cancelled |
| `StreamCompleted` | Already completed (all tokens claimed) |
