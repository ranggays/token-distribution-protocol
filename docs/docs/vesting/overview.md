---
title: Vesting Overview
sidebar_position: 1
description: Four vesting schedule types for configurable token distribution.
---

# Vesting Schedules

Velora supports four vesting schedule types. Each determines how tokens unlock over time.

| Schedule | Unlock behavior | Use case |
|---|---|---|
| **[Linear](./linear)** | Continuous unlock from start to end | Employee vesting, gradual token release |
| **[Cliff](./cliff)** | All tokens unlock at one timestamp | Delayed lump-sum payments |
| **[Cliff + Linear](./cliff-linear)** | Lump sum at cliff, then streaming | Advisor agreements, investor unlocks |
| **[Milestone](./milestone)** | Manual release by authority | Grant milestones, conditional unlocks |

## How schedules work

When you create a stream, you set a `ScheduleType` variant and the relevant timestamp/amount parameters. The on-chain program uses these to compute how many tokens are unlocked at any point in time.

```rust
pub enum ScheduleType {
    Linear,
    Cliff,
    CliffLinear,
    Milestone,
}
```

## Unlock calculation

Each schedule type has its own formula for computing the unlocked amount. The program recalculates on every `withdraw` call based on the current timestamp.

- **Linear, Cliff, Cliff+Linear**: deterministic math based on `Clock::get().unix_timestamp`
- **Milestone**: gated by a boolean flag flipped by the release authority

See each schedule's page for the exact formulas.

## Choosing a schedule

- Need time-based automatic release? Use **Linear** or **Cliff+Linear**.
- Need a fixed release date? Use **Cliff**.
- Need human-in-the-loop control? Use **Milestone** with a `SingleKey` or `MultiSig` authority.
