---
title: Authority Model
sidebar_position: 4
description: Control who can release milestones and cancel streams.
---

# Authority Model

Velora uses two independent authority systems: **release authority** (who can trigger milestone releases) and **cancel authority** (who can cancel a stream).

## Release Authority

Controls who can call `release_milestone` on milestone-type streams. Set via `authority_type` and `release_authority` at stream creation.

| `AuthorityType` | `release_authority` field | Behavior |
|---|---|---|
| `None` | Ignored | No one can release. Tokens are permanently locked unless the stream is cancelled. |
| `SingleKey` | A single pubkey | That key must sign the `release_milestone` instruction. |
| `MultiSig` | A multisig program address | The multisig program validates that enough signers have approved. |

:::tip
For grant programs, use `MultiSig` with a 3-of-5 Squads multisig to require committee approval before releasing funds.
:::

## Cancel Authority

Controls who can call `cancel` on a stream. Set via `cancel_authority` at creation and immutable after.

| `CancelAuthority` | Who can cancel |
|---|---|
| `CreatorOnly` | The `creator` of the stream |
| `Either` | The `creator` OR the `recipient` |
| `Neither` | No one — the stream runs to completion |

The `is_cancellable` flag acts as a master switch. When `false`, cancel attempts are rejected regardless of `cancel_authority`.

## Decision matrix

| Scenario | `is_cancellable` | `cancel_authority` | Result |
|---|---|---|---|
| Creator can cancel | `true` | `CreatorOnly` | Only creator can cancel |
| Either party can cancel | `true` | `Either` | Creator or recipient |
| Uncancellable stream | `false` | (any) | No one can cancel |
| Locked milestone | `true` | `CreatorOnly` | Creator can cancel, but only they can; recipient cannot |

## Immutability

Both `authority_type` and `cancel_authority` are set at stream creation and stored in the `StreamConfig` account. They cannot be changed after initialization. This is a security property: neither party can escalate their privileges.

## Combining authorities

A stream can have both a release authority (for milestone vesting) and a cancel authority independently:

```typescript
{
  scheduleType: { milestone: {} },
  authorityType: { singleKey: {} },
  releaseAuthority: grantCommittee.publicKey,
  isCancellable: true,
  cancelAuthority: { creatorOnly: {} },
}
```

In this configuration:
- The grant committee can release the milestone
- The creator can cancel the stream (recovering funds if needed)
- The recipient can withdraw only after milestone release
