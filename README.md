# Token Distribution Protocol

A Solana on-chain program for distributing SPL tokens on configurable vesting schedules. Built with Anchor as part of the Mancer × Superteam Indonesia Career Accelerator S1, Team 5.

## What It Does

The protocol lets a creator lock tokens into a program-controlled vault and release them to a recipient according to a schedule. Supported schedule types:

| Schedule | Behaviour |
|---|---|
| **Linear** | Tokens unlock continuously from `start_ts` to `end_ts` |
| **Cliff** | All tokens unlock at a single point in time |
| **Cliff + Linear** | A lump sum unlocks at the cliff, then the remainder streams linearly |
| **Milestone** | A designated release authority triggers the unlock manually |

Streams are cancellable or non-cancellable at creation time, and the cancel authority can be set to creator-only, either party, or neither.

## Repository Structure

```
token-distribution-protocol/
├── backend/                    Anchor workspace (Rust program + TS tests)
│   ├── programs/backend/src/   Program source (~700 lines, single file)
│   ├── tests/                  Anchor integration tests (23 cases)
│   ├── Anchor.toml             Workspace config
│   └── README.md               Full setup and deploy guide
├── landing-page/               Next.js frontend ("Velora")
│   ├── src/app/                App Router pages (dashboard, claim, create-vesting)
│   ├── src/components/         UI components (Velora-branded)
│   └── src/lib/                Chain interaction helpers (velora-chain.tsx)
├── docs/
│   └── architecture.md         PDA design, token flow, authority model
└── .github/workflows/ci.yml    CI pipeline (backend only)
```

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Rust | 1.91.0 (via `rustup`) |
| Solana CLI | stable |
| Anchor CLI | 0.32.1 (via `avm`) |
| Node.js | 18+ |
| Yarn | 1.x |

### Setup

```bash
# 1. Clone
git clone https://github.com/ranggays/token-distribution-protocol.git
cd token-distribution-protocol/backend

# 2. Install JS deps
yarn install

# 3. Generate a local keypair if you don't have one
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json

# 4. Sync the program ID to your local keypair
anchor keys sync

# 5. Build
anchor build

# 6. Test (spins up a local validator automatically)
anchor test
```

> **Note on `anchor keys sync`:** Anchor 1.x enforces that the program ID in `declare_id!` matches the keypair in `target/deploy/`. Run `anchor keys sync` once after cloning before building.

### Deploy to Devnet

```bash
solana config set --url devnet
solana airdrop 2
anchor build
anchor deploy --provider.cluster devnet
```

See [`backend/README.md`](backend/README.md) for the full walkthrough.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the PDA derivation scheme, vault token flow, and authority model.

## Development Status

| Week | Milestone | Status |
|---|---|---|
| 1 | Research & architecture design | Done |
| 2 | Account struct definitions | Done |
| 3 | Anchor scaffold + CI | Done |
| 4 | Instruction logic (create, withdraw, cancel) | Done |
| 5 | Frontend + devnet deploy | Done |
| 6 | Vesting math + security tests | Done |
| 7 | Analytics + landing page polish | Done |
| 8 | Bug fixes, status report, Phase 3 prep | Done |

See [`docs/architecture.md`](docs/architecture.md) for known limitations and Phase 3 roadmap.

## Team

**Team 5 — Mancer × Superteam Indonesia Career Accelerator S1**

- Rangga — primary implementation, frontend, devnet deployment
- Axel — smart contract internals, backend architecture, security
