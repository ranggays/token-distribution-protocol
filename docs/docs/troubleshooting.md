---
title: Troubleshooting
sidebar_position: 10
description: Common issues and solutions when building with Velora.
---

# Troubleshooting

Common issues when building, testing, or integrating with Velora.

## Build issues

### `anchor build` fails with "program ID mismatch"

**Cause**: The `declare_id!` macro in the source code doesn't match your deploy keypair.

**Fix**:

```bash
anchor keys sync
anchor build
```

This updates the program ID in source to match `~/.config/solana/id.json`.

### `anchor build` fails with Rust compilation errors

**Cause**: Rust toolchain version mismatch.

**Fix**: Ensure you're on Rust 1.89.0+:

```bash
rustup update stable
rustc --version
```

### `anchor test` hangs or times out

**Cause**: Local validator port conflict or stale process.

**Fix**:

```bash
# Kill any running solana-test-validator
pkill -f solana-test-validator

# Retry
anchor test
```

## Transaction issues

### `InsufficientFundsForRent` on create_stream

**Cause**: Creator doesn't have enough SOL to cover rent for the `StreamConfig` and vault accounts.

**Fix**: Airdrop or transfer SOL to the creator account:

```bash
solana airdrop 2 <CREATOR_ADDRESS>
```

### `custom program error: 0x1774` (6000 — InvalidSchedule)

**Cause**: Schedule parameters are invalid.

**Check**:
- `end_ts > start_ts`
- For cliff: `cliff_ts >= start_ts`
- For cliff-linear: `cliff_amount < total_amount`
- `total_amount > 0`

### `custom program error: 0x1776` (6002 — StreamNotCancellable)

**Cause**: Trying to cancel a stream created with `is_cancellable = false`.

**Resolution**: This is by design. Non-cancellable streams cannot be cancelled. Plan accordingly at creation time.

### `custom program error: 0x1779` (6005 — NothingToClaim)

**Cause**: Recipient calls `withdraw` but no new tokens are unlocked.

**Check**:
- Current time vs `start_ts` — has vesting started?
- `amount_claimed` — have all unlocked tokens already been claimed?

## Client-side issues

### PDA derivation returns different address than on-chain

**Cause**: Seed mismatch. Common mistakes:
- Using big-endian instead of little-endian for `stream_id`
- Missing the `"stream"` or `"vault"` prefix buffer
- Wrong `programId`

**Fix**: Verify seeds match exactly:

```typescript
const [pda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("stream"),                    // must be exact string
    creator.toBuffer(),                       // Pubkey bytes
    streamId.toArrayLike(Buffer, "le", 8),    // u64 LE, 8 bytes
  ],
  programId                                    // correct program ID
);
```

### `AccountNotInitialized` on vault

**Cause**: The vault token account hasn't been created. Velora creates the vault automatically during `create_stream` via PDA init.

**Check**: Ensure you're passing the correct vault PDA derived from the `stream_config` address.

### Transaction simulation fails but no error code

**Cause**: Compute budget exceeded or account constraint violation.

**Fix**: Try increasing compute units:

```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

const tx = await program.methods
  .createStream(/* ... */)
  .preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ])
  // ... rest of transaction
  .rpc();
```

## Testing issues

### Tests fail with "account already in use"

**Cause**: Previous test run didn't clean up. Anchor test validator reuses accounts between runs.

**Fix**:

```bash
anchor test --skip-local-validator
# or
anchor test
```

Anchor handles validator lifecycle automatically. If issues persist:

```bash
rm -rf target/deploy
anchor build
anchor test
```

## Still stuck?

- Check the [Error Codes](./reference/errors) reference for specific error meanings
- Review the [Architecture](./architecture) doc for account and PDA details
- Open an issue on [GitHub](https://github.com/ranggays/token-distribution-protocol/issues)
