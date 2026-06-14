---
slug: /
sidebar_position: 1
title: Velora Documentation
---

# Velora Documentation

Velora is a token vesting protocol on Solana. It lets creators lock SPL tokens into program-controlled vaults and release them to recipients on configurable schedules.

## What is Velora?

A Solana on-chain program built with Anchor that supports four vesting schedule types:

- **Linear** — tokens unlock continuously over time
- **Cliff** — all tokens unlock at a single timestamp
- **Cliff + Linear** — lump sum at cliff, then continuous streaming
- **Milestone** — manual release by a designated authority

Streams are cancellable or non-cancellable at creation time, with flexible authority controls.

## Where to start

| If you want to... | Go to |
|---|---|
| Build and test the program locally | [Quick Start](./quick-start) |
| Understand the protocol architecture | [Architecture](./architecture) |
| Learn about vesting schedule types | [Vesting Overview](./vesting/overview) |
| Integrate with TypeScript | [SDK Reference](./reference/sdk-overview) |
| Look up error codes | [Error Reference](./reference/errors) |
