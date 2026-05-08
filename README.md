# Token Distribution Protocol Backend

Week 3 backend scaffold for a Solana Token Distribution Protocol built with Anchor.

This repository currently sets up the on-chain program structure so both developers can start implementation in Week 4. The program includes:

- empty instruction handlers for `create_stream`, `withdraw`, and `cancel`
- account and enum definitions aligned with the Week 2 architecture
- local test wiring through Anchor
- CI for build and test on every push

## Current Week 3 Scope

Implemented in this checkpoint:

- Anchor workspace initialized and compiling target structure present
- backend program scaffold under `programs/backend`
- `StreamConfig` and `ClaimReceipt` account structs defined
- schedule and authority enums defined
- 1 minimal passing test that verifies the deployed workspace is loaded
- GitHub Actions workflow for build and test

Not implemented yet in Week 3:

- stream creation logic
- withdrawal logic
- cancellation logic
- vault token CPI flow
- milestone release logic

## Prerequisites

Install these before running the project:

- Rust `1.89.0`
- Solana CLI
- Anchor CLI `0.32.1`
- Node.js `18+`
- Yarn Classic `1.x`

Recommended tool installers:

- Rust: `rustup`
- Solana CLI: Solana install script or release archive
- Anchor CLI: `avm` is the simplest option

## Setup

1. Clone the repository.
2. Install JavaScript dependencies:

```bash
yarn install
```

3. Confirm Solana CLI is installed:

```bash
solana --version
```

4. Confirm Anchor CLI is installed:

```bash
anchor --version
```

5. Point Solana to the cluster you want to use.

For local development:

```bash
solana config set --url localhost
```

For devnet:

```bash
solana config set --url devnet
```

6. Make sure your wallet exists at the path used in [Anchor.toml](/home/ranggayoviesaputra/tdp/backend/Anchor.toml:1):

```bash
~/.config/solana/id.json
```

If you do not have one yet:

```bash
solana-keygen new
```

## Build

Build the Anchor program:

```bash
anchor build
```

Or through the package script:

```bash
yarn build
```

## Run Tests

Run the Anchor test suite:

```bash
anchor test
```

Or:

```bash
yarn test
```

The current test is intentionally minimal. It proves the workspace loads after Anchor builds and deploys the program to the local validator.

## Deploy To Devnet

1. Switch Solana CLI to devnet:

```bash
solana config set --url devnet
```

2. Fund your wallet:

```bash
solana airdrop 2
```

3. Build the program:

```bash
anchor build
```

4. Deploy:

```bash
anchor deploy --provider.cluster devnet
```

5. If the deployed program id changes, update:

- `declare_id!` in [programs/backend/src/lib.rs](/home/ranggayoviesaputra/tdp/backend/programs/backend/src/lib.rs:1)
- `programs.localnet.backend` in [Anchor.toml](/home/ranggayoviesaputra/tdp/backend/Anchor.toml:1)
- any test constants that reference the program id

## Project Structure

```text
programs/backend/src/lib.rs   Anchor program scaffold
tests/backend.ts              Anchor test entrypoint
Anchor.toml                   Anchor workspace config
migrations/deploy.ts          Deploy hook
plan/doc/                     Week 1 and Week 2 research references
plan/brief_week3.md           Week 3 task brief
```

## Partner Verification

Week 3 requires confirmation from the second developer that the repo can be cloned and run from this README.

Record that confirmation here after your partner completes it:

- Partner name:
- Clone date:
- Result:
- Notes:
