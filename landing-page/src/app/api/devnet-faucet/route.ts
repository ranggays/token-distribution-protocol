import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const devnetRpcUrl = "https://api.devnet.solana.com";
const defaultMint = "2izHDnU4RsQRDMpHTTrsjCwbzS3XDXBRStqtWosfVf6j";
const defaultAmount = "1000";

function parseAuthoritySecret() {
  const secret =
    process.env.VELORA_FAUCET_AUTHORITY_SECRET ??
    readFileSync(join(homedir(), ".config/solana/id.json"), "utf8");
  const parsed = JSON.parse(secret) as unknown;

  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "number")) {
    throw new Error("Invalid faucet authority keypair.");
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

function parseWallet(payload: unknown) {
  const value =
    typeof payload === "object" && payload && "wallet" in payload
      ? String(payload.wallet).trim()
      : "";

  return new PublicKey(value);
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  let wallet: PublicKey;

  try {
    wallet = parseWallet(payload);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Wallet must be a valid Solana address." },
      { status: 400 },
    );
  }

  try {
    const connection = new Connection(process.env.VELORA_DEVNET_RPC_URL ?? devnetRpcUrl, "confirmed");
    const authority = parseAuthoritySecret();
    const mint = new PublicKey(process.env.VELORA_TEST_MINT ?? defaultMint);
    const targetAmount = BigInt(process.env.VELORA_FAUCET_AMOUNT ?? defaultAmount);
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mint,
      wallet,
    );
    const currentBalance = await connection.getTokenAccountBalance(tokenAccount.address, "confirmed");
    const currentAmount = BigInt(currentBalance.value.amount);
    const mintAmount = targetAmount > currentAmount ? targetAmount - currentAmount : BigInt(0);
    let signature: string | null = null;

    if (mintAmount > BigInt(0)) {
      signature = await mintTo(
        connection,
        authority,
        mint,
        tokenAccount.address,
        authority,
        mintAmount,
      );
    }

    const refreshedBalance = await connection.getTokenAccountBalance(tokenAccount.address, "confirmed");

    return NextResponse.json({
      ok: true,
      signature,
      tokenAccount: tokenAccount.address.toBase58(),
      balance: refreshedBalance.value.amount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not mint test tokens.",
      },
      { status: 500 },
    );
  }
}
