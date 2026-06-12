---
title: SDK Overview
sidebar_position: 1
description: TypeScript client library for the Velora program.
---

# SDK Overview

The Velora SDK is a TypeScript client library built on `@coral-xyz/anchor`. It provides helper functions for PDA derivation, instruction building, and account deserialization.

## Installation

```bash
yarn add @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

The SDK uses Anchor's generated IDL and program types. Import the program IDL and construct an `AnchorProvider`:

```typescript
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import idl from "./idl/backend.json";

const provider = AnchorProvider.env();
const program = new Program(idl, provider);
```

## Module structure

| Module | Description |
|---|---|
| [Stream Config](./sdk-stream-config) | Type definitions for `StreamConfig`, `ScheduleType`, `AuthorityType`, `CancelAuthority` |
| [Derive PDAs](./sdk-derive-pdas) | Helper functions for deterministic address derivation |
| [Create Stream](./sdk-create-stream) | Build and send `create_stream` transactions |
| [Withdraw](./sdk-withdraw) | Build and send `withdraw` transactions |
| [Cancel](./sdk-cancel) | Build and send `cancel` transactions |

## Key types

```typescript
// Schedule types
type ScheduleType = "linear" | "cliff" | "cliffLinear" | "milestone";

// Authority types
type AuthorityType = "none" | "singleKey" | "multiSig";

// Cancel authority
type CancelAuthority = "creatorOnly" | "either" | "neither";

// Stream status
type StreamStatus = "active" | "cancelled" | "completed";
```

## Anchor IDL

The program IDL is generated at build time:

```bash
cd backend && anchor build
# Output: target/idl/backend.json
```

Import this file into your TypeScript project to get full type safety and autocompletion.
