---
title: Getting Started
sidebar_position: 2
description: Prerequisites and setup for the Velora token vesting protocol.
---

# Getting Started

Set up the Velora development environment, build the on-chain program, and run the test suite.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | 1.89.0+ | `rustup` |
| Solana CLI | stable | [solana.com](https://solana.com/docs/installation) |
| Anchor CLI | 0.32.1 | `cargo install --git https://github.com/coral-xyz/anchor avm` then `avm install 0.32.1` |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Yarn | 1.x | `npm install -g yarn` |

## Clone and install

```bash
git clone https://github.com/ranggays/token-distribution-protocol.git
cd token-distribution-protocol/backend
yarn install
```

## Generate a local keypair

If you don't already have a Solana keypair:

```bash
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
```

## Sync the program ID

Anchor 0.32+ enforces that the program ID in `declare_id!` matches your deploy keypair:

```bash
anchor keys sync
```

Run this once after cloning. It updates the program ID in the source code to match your local keypair.

## Build

```bash
anchor build
```

This compiles the Rust program to a Solana BPF binary at `target/deploy/backend.so`.

## Test

```bash
anchor test
```

Anchor spins up a local validator, deploys the program, and runs the integration test suite. The tests cover stream creation, withdrawals, cancellations, and all four vesting schedule types.

## Next steps

- [Quick Start](./quick-start) — deploy to devnet and interact with the program
- [Architecture](./architecture) — understand PDA derivation, token flow, and the authority model
- [Vesting Overview](./vesting/overview) — learn about the four schedule types
