---
title: Error Codes
sidebar_position: 8
description: Complete list of on-chain error codes and how to resolve them.
---

# Error Codes

All Velora error codes are defined in the program source. Anchor returns these as structured errors with a numeric code and a string identifier.

## Error list

| Code | Identifier | Description | Resolution |
|---|---|---|---|
| 6000 | `InvalidSchedule` | Invalid schedule parameters (e.g., `end_ts <= start_ts`) | Check timestamp and amount values |
| 6001 | `StreamNotActive` | Operation on a non-active stream | Stream may be cancelled or completed |
| 6002 | `StreamNotCancellable` | Cancel attempted on non-cancellable stream | `is_cancellable` is `false` |
| 6003 | `StreamCancelled` | Operation on an already-cancelled stream | Cannot withdraw or cancel again |
| 6004 | `StreamCompleted` | Operation on a completed stream | All tokens already claimed |
| 6005 | `NothingToClaim` | Withdrawal with no unlockable tokens | No new tokens unlocked since last claim |
| 6006 | `UnauthorizedRecipient` | Withdrawal by non-recipient | Only `stream_config.recipient` can withdraw |
| 6007 | `UnauthorizedCancel` | Cancel by unauthorized party | Check `cancel_authority` setting |
| 6008 | `UnauthorizedRelease` | Milestone release by non-authority | Check `authority_type` and `release_authority` |
| 6009 | `ArithmeticOverflow` | Math overflow in unlock calculation | Unlikely with normal amounts; report if seen |
| 6010 | `InvalidAuthorityType` | Authority type mismatch for operation | Milestone operations require non-None authority |
| 6011 | `MilestoneNotReleased` | Withdrawal on unreleased milestone | Call `release_milestone` first |
| 6012 | `InsufficientVaultBalance` | Vault has fewer tokens than expected | Possible if vault was somehow drained outside program |
| 6013 | `InvalidCancelAuthority` | Invalid cancel authority combination | Check `is_cancellable` and `cancel_authority` |

## Error handling in TypeScript

```typescript
import { Program } from "@coral-xyz/anchor";

try {
  await program.methods
    .withdraw()
    .accounts({ /* ... */ })
    .signers([recipient])
    .rpc();
} catch (err) {
  if (err.error) {
    const code = err.error.errorCode.code;
    const number = err.error.errorCode.number;

    switch (code) {
      case "NothingToClaim":
        console.log("No tokens available to claim yet.");
        break;
      case "StreamCancelled":
        console.log("This stream has been cancelled.");
        break;
      case "UnauthorizedRecipient":
        console.log("Only the recipient can withdraw.");
        break;
      default:
        console.error(`Error ${number}: ${code}`);
    }
  }
}
```

## Common issues

### "InvalidSchedule" on create_stream

Ensure:
- `end_ts > start_ts`
- `cliff_ts >= start_ts` and `cliff_ts <= end_ts` (for cliff/cliff-linear)
- `cliff_amount < total_amount` (for cliff-linear)
- `total_amount > 0`

### "NothingToClaim" on withdraw

The stream may not have started yet, or the recipient already claimed all unlocked tokens. Check:
- Current time vs `start_ts`
- `amount_claimed` vs computed unlocked amount

### "StreamNotCancellable" on cancel

The stream was created with `is_cancellable = false`. This is immutable — the stream cannot be cancelled.
