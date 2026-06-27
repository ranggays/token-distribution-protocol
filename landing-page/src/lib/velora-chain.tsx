"use client";

import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  VersionedTransaction,
  type TransactionSignature,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const PROGRAM_ID = new PublicKey("Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V");
const DEVNET_RPC_URL = process.env.NEXT_PUBLIC_VELORA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
const ZERO_PUBKEY = PublicKey.default;

const veloraIdl = {
  address: PROGRAM_ID.toBase58(),
  metadata: {
    name: "backend",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "cancel",
      discriminator: [232, 219, 223, 41, 219, 236, 220, 190],
      accounts: [
        { name: "authority", signer: true },
        { name: "streamConfig", writable: true },
        { name: "vault", writable: true },
        { name: "recipientTokenAccount", writable: true },
        { name: "creatorTokenAccount", writable: true },
        { name: "tokenProgram", address: TOKEN_PROGRAM_ID.toBase58() },
      ],
      args: [],
    },
    {
      name: "createStream",
      discriminator: [71, 188, 111, 127, 108, 40, 229, 158],
      accounts: [
        { name: "creator", writable: true, signer: true },
        { name: "recipient" },
        { name: "mint" },
        { name: "streamConfig", writable: true },
        { name: "vault", writable: true },
        { name: "creatorTokenAccount", writable: true },
        { name: "tokenProgram", address: TOKEN_PROGRAM_ID.toBase58() },
        { name: "systemProgram", address: SystemProgram.programId.toBase58() },
        { name: "rent", address: SYSVAR_RENT_PUBKEY.toBase58() },
      ],
      args: [{ name: "params", type: { defined: { name: "CreateStreamParams" } } }],
    },
    {
      name: "releaseMilestone",
      discriminator: [56, 2, 199, 164, 184, 108, 167, 222],
      accounts: [
        { name: "authority", signer: true },
        { name: "streamConfig", writable: true },
      ],
      args: [],
    },
    {
      name: "withdraw",
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34],
      accounts: [
        { name: "recipient", signer: true },
        { name: "streamConfig", writable: true },
        { name: "vault", writable: true },
        { name: "recipientTokenAccount", writable: true },
        { name: "tokenProgram", address: TOKEN_PROGRAM_ID.toBase58() },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "StreamConfig",
      discriminator: [130, 127, 218, 245, 133, 158, 70, 198],
    },
  ],
  errors: [
    { code: 6000, name: "ZeroAmount", msg: "Stream total amount must be greater than zero." },
    { code: 6001, name: "InvalidSchedule", msg: "Stream end timestamp must be greater than start timestamp." },
    { code: 6002, name: "SameRecipientCreator", msg: "Stream recipient and creator cannot be the same wallet." },
    { code: 6003, name: "UnsupportedSchedule", msg: "Schedule type is not supported for this instruction." },
    { code: 6004, name: "Unauthorized", msg: "Signer is not authorized for this stream." },
    { code: 6005, name: "StreamNotActive", msg: "Stream is not active." },
    { code: 6006, name: "NothingToWithdraw", msg: "There are no unlocked tokens available to withdraw." },
    { code: 6007, name: "AlreadyCancelled", msg: "Stream is already cancelled." },
    { code: 6008, name: "FullyVested", msg: "Stream is already fully vested." },
    { code: 6009, name: "StreamExpired", msg: "Stream has expired." },
    { code: 6010, name: "MathOverflow", msg: "Vesting math overflowed." },
    { code: 6011, name: "InvalidMint", msg: "Token account mint does not match the stream mint." },
    { code: 6012, name: "InvalidVault", msg: "Vault token account does not match the stream vault." },
    { code: 6013, name: "CancellationDisabled", msg: "Cancellation is disabled for this stream." },
    { code: 6014, name: "InvalidCliffAmount", msg: "Cliff amount cannot exceed the total stream amount." },
  ],
  types: [
    {
      name: "AuthorityType",
      type: { kind: "enum", variants: [{ name: "None" }, { name: "SingleKey" }, { name: "MultiSig" }] },
    },
    {
      name: "CancelAuthority",
      type: { kind: "enum", variants: [{ name: "CreatorOnly" }, { name: "Either" }, { name: "Neither" }] },
    },
    {
      name: "CreateStreamParams",
      type: {
        kind: "struct",
        fields: [
          { name: "streamId", type: "u64" },
          { name: "totalAmount", type: "u64" },
          { name: "startTimestamp", type: "i64" },
          { name: "endTimestamp", type: "i64" },
          { name: "cliffTimestamp", type: "i64" },
          { name: "cliffAmount", type: "u64" },
          { name: "scheduleType", type: { defined: { name: "ScheduleType" } } },
          { name: "authorityType", type: { defined: { name: "AuthorityType" } } },
          { name: "releaseAuthority", type: { option: "pubkey" } },
          { name: "milestoneDescription", type: { array: ["u8", 128] } },
          { name: "isCancellable", type: "bool" },
          { name: "cancelAuthority", type: { defined: { name: "CancelAuthority" } } },
        ],
      },
    },
    {
      name: "ScheduleType",
      type: {
        kind: "enum",
        variants: [{ name: "Linear" }, { name: "Cliff" }, { name: "CliffLinear" }, { name: "Milestone" }],
      },
    },
    {
      name: "StreamConfig",
      type: {
        kind: "struct",
        fields: [
          { name: "streamId", type: "u64" },
          { name: "creator", type: "pubkey" },
          { name: "recipient", type: "pubkey" },
          { name: "mint", type: "pubkey" },
          { name: "vault", type: "pubkey" },
          { name: "scheduleType", type: { defined: { name: "ScheduleType" } } },
          { name: "totalAmount", type: "u64" },
          { name: "amountClaimed", type: "u64" },
          { name: "startTimestamp", type: "i64" },
          { name: "endTimestamp", type: "i64" },
          { name: "cliffTimestamp", type: "i64" },
          { name: "cliffAmount", type: "u64" },
          { name: "authorityType", type: { defined: { name: "AuthorityType" } } },
          { name: "releaseAuthority", type: "pubkey" },
          { name: "milestoneReleased", type: "bool" },
          { name: "milestoneDescription", type: { array: ["u8", 128] } },
          { name: "status", type: { defined: { name: "StreamStatus" } } },
          { name: "isCancellable", type: "bool" },
          { name: "cancelAuthority", type: { defined: { name: "CancelAuthority" } } },
          { name: "createdAt", type: "i64" },
          { name: "bump", type: "u8" },
          { name: "vaultBump", type: "u8" },
          { name: "reserved", type: { array: ["u8", 30] } },
        ],
      },
    },
    {
      name: "StreamStatus",
      type: { kind: "enum", variants: [{ name: "Active" }, { name: "Cancelled" }, { name: "Completed" }] },
    },
  ],
} satisfies Idl;

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  on?: (event: "connect" | "disconnect" | "accountChanged", callback: (publicKey?: PublicKey) => void) => void;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

type StreamAccount = {
  streamId: BN;
  creator: PublicKey;
  recipient: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  scheduleType: Record<string, unknown>;
  totalAmount: BN;
  amountClaimed: BN;
  startTimestamp: BN;
  endTimestamp: BN;
  cliffTimestamp: BN;
  cliffAmount: BN;
  milestoneReleased: boolean;
  releaseAuthority: PublicKey;
  status: Record<string, unknown>;
  isCancellable: boolean;
};

export type StreamView = {
  publicKey: PublicKey;
  streamId: string;
  creator: PublicKey;
  recipient: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  scheduleType: "Linear" | "Cliff" | "CliffLinear" | "Milestone";
  status: "Active" | "Cancelled" | "Completed";
  totalAmount: bigint;
  amountClaimed: bigint;
  unlockedAmount: bigint;
  claimableAmount: bigint;
  startTimestamp: number;
  endTimestamp: number;
  cliffTimestamp: number;
  milestoneReleased: boolean;
  releaseAuthority: PublicKey;
  isCancellable: boolean;
};

export type CreateStreamInput = {
  streamId: bigint;
  mint: PublicKey;
  recipient: PublicKey;
  totalAmount: bigint;
  startTimestamp: number;
  endTimestamp: number;
  cliffTimestamp: number;
  cliffAmount: bigint;
  scheduleType: StreamView["scheduleType"];
  authorityType: "None" | "SingleKey" | "MultiSig";
  releaseAuthority: PublicKey | null;
  milestoneDescription: string;
  isCancellable: boolean;
  cancelAuthority: "CreatorOnly" | "Either" | "Neither";
};

export type CreateStreamResult = {
  signature: TransactionSignature;
  streamConfig: PublicKey;
  streamId: bigint;
  creator: PublicKey;
  recipient: PublicKey;
};

export type TokenBalance = {
  tokenAccount: PublicKey;
  amount: bigint;
};

type ChainContextValue = {
  connection: Connection;
  walletPublicKey: PublicKey | null;
  walletLabel: string;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  getWalletTokenBalance: (mint: PublicKey) => Promise<TokenBalance | null>;
  streams: StreamView[];
  loadingStreams: boolean;
  createStream: (input: CreateStreamInput) => Promise<CreateStreamResult>;
  withdraw: (stream: StreamView) => Promise<TransactionSignature>;
  cancel: (stream: StreamView) => Promise<TransactionSignature>;
  releaseMilestone: (stream: StreamView) => Promise<TransactionSignature>;
};

const ChainContext = createContext<ChainContextValue | null>(null);

function getPhantom() {
  if (typeof window === "undefined") return null;
  return window.solana?.isPhantom ? window.solana : null;
}

function shortKey(publicKey: PublicKey | null) {
  if (!publicKey) return "Connect wallet";
  const value = publicKey.toBase58();
  return `${value.slice(0, 5)}...${value.slice(-5)}`;
}

function enumName(value: Record<string, unknown> | undefined, fallback: string) {
  const key = value ? Object.keys(value)[0] : undefined;
  if (!key) return fallback;
  return `${key[0]?.toUpperCase()}${key.slice(1)}`;
}

function scheduleToAnchor(scheduleType: StreamView["scheduleType"]) {
  const key = scheduleType[0].toLowerCase() + scheduleType.slice(1);
  return { [key]: {} };
}

function authorityTypeToAnchor(authorityType: "None" | "SingleKey" | "MultiSig") {
  const key = authorityType[0].toLowerCase() + authorityType.slice(1);
  return { [key]: {} };
}

function cancelAuthorityToAnchor(cancelAuthority: "CreatorOnly" | "Either" | "Neither") {
  const key = cancelAuthority[0].toLowerCase() + cancelAuthority.slice(1);
  return { [key]: {} };
}

/** Translate raw SPL Token / Anchor program errors into human-readable messages. */
const SPL_TOKEN_ERRORS: Record<number, string> = {
  0x0: "Token account owner does not match the signer. Use \"Get test tokens\" to mint to your current wallet.",
  0x1: "Insufficient token balance for this transaction.",
  0x2: "Invalid token mint.",
  0x3: "Token account is frozen.",
  0x4: "Token account owner does not match the signer. Use \"Get test tokens\" to mint to your current wallet.",
  0x5: "Token account is not initialized.",
  0x6: "Token account is immutable — owner cannot be reassigned.",
  0x7: "Token amount overflow.",
  0x8: "Token account already exists.",
  0x9: "Not enough tokens available.",
  0xa: "Cannot transfer to the same account.",
};

const ANCHOR_ERRORS: Record<number, string> = {
  6000: "Token amount must be greater than zero.",
  6001: "Vesting end date must be after the start date.",
  6002: "Recipient and creator cannot be the same wallet.",
  6003: "This schedule type is not supported for this action.",
  6004: "Signer is not authorized for this stream.",
  6005: "Stream is not active.",
  6006: "No unlocked tokens available to withdraw.",
  6007: "Stream is already cancelled.",
  6008: "Stream is already fully vested.",
  6009: "Stream has expired.",
  6010: "Vesting calculation overflowed.",
  6011: "Token account mint does not match the stream mint.",
  6012: "Vault token account does not match.",
  6013: "Cancellation is disabled for this stream.",
  6014: "Cliff amount cannot exceed the total stream amount.",
};

function parseProgramError(error: unknown): string | null {
  // Build searchable text from every surface the error might expose.
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    parts.push(error.toString());
  }
  // Anchor/SendTransactionError often stashes raw logs here.
  const errorObj = error as Record<string, unknown>;
  if (Array.isArray(errorObj.logs)) {
    parts.push(errorObj.logs.join("\n"));
  }
  const haystack = parts.join("\n");

  // Match "custom program error: 0xNNNN" (Anchor/SPL Token)
  const hexMatch = haystack.match(/custom program error:\s*0x([0-9a-fA-F]+)/);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    if (code >= 0x1770) {
      const anchorCode = code - 0x1770;
      return ANCHOR_ERRORS[anchorCode] ?? `Program error ${anchorCode}.`;
    }
    return SPL_TOKEN_ERRORS[code] ?? `Token program error 0x${code.toString(16)}.`;
  }

  // Match raw log lines: "Error: owner does not match"
  if (/owner does not match/i.test(haystack)) {
    return "Token account owner does not match the signer. Use \"Get test tokens\" to mint to your current wallet.";
  }
  if (/not enough|insufficient/i.test(haystack)) {
    return "Insufficient token balance for this transaction.";
  }

  return null;
}

/** Wrap any async operation to throw human-readable errors. */
function humanizeError<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error) => {
    console.debug("[humanizeError] raw error:", error);
    const human = parseProgramError(error);
    if (human) throw new Error(human);
    throw error;
  });
}

function descriptionToBytes(value: string) {
  const bytes = new TextEncoder().encode(value);
  return Array.from({ length: 128 }, (_, index) => bytes[index] ?? 0);
}

function decodeAmount(value: BN | number | bigint | undefined) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(value?.toString() ?? "0");
}

function deriveStream(creator: PublicKey, recipient: PublicKey, streamId: bigint) {
  const streamIdBuffer = new BN(streamId.toString()).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stream"), creator.toBuffer(), recipient.toBuffer(), streamIdBuffer],
    PROGRAM_ID,
  )[0];
}

function deriveVault(streamConfig: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), streamConfig.toBuffer()], PROGRAM_ID)[0];
}

function computeUnlocked(stream: StreamAccount) {
  const now = Math.floor(Date.now() / 1000);
  const total = decodeAmount(stream.totalAmount);
  const start = Number(stream.startTimestamp.toString());
  const end = Number(stream.endTimestamp.toString());
  const cliff = Number(stream.cliffTimestamp.toString());
  const cliffAmount = decodeAmount(stream.cliffAmount);
  const schedule = enumName(stream.scheduleType, "Linear");
  let unlocked = BigInt(0);

  if (schedule === "Milestone") {
    unlocked = stream.milestoneReleased ? total : BigInt(0);
  } else if (schedule === "Cliff") {
    unlocked = now < cliff ? BigInt(0) : total;
  } else if (schedule === "CliffLinear") {
    if (now < cliff) {
      unlocked = BigInt(0);
    } else {
      const linearTotal = total - cliffAmount;
      const linearUnlocked = now >= end ? linearTotal : (linearTotal * BigInt(now - cliff)) / BigInt(end - cliff);
      unlocked = cliffAmount + linearUnlocked;
    }
  } else {
    // Linear
    if (now <= start) unlocked = BigInt(0);
    else if (now >= end) unlocked = total;
    else unlocked = (total * BigInt(now - start)) / BigInt(end - start);
  }

  return unlocked;
}

function computeClaimable(stream: StreamAccount) {
  if (enumName(stream.status, "Active") !== "Active") return BigInt(0);

  const unlocked = computeUnlocked(stream);
  const claimed = decodeAmount(stream.amountClaimed);
  return unlocked > claimed ? unlocked - claimed : BigInt(0);
}

function normalizeStream(publicKey: PublicKey, account: StreamAccount): StreamView {
  return {
    publicKey,
    streamId: account.streamId.toString(),
    creator: account.creator,
    recipient: account.recipient,
    mint: account.mint,
    vault: account.vault,
    scheduleType: enumName(account.scheduleType, "Linear") as StreamView["scheduleType"],
    status: enumName(account.status, "Active") as StreamView["status"],
    totalAmount: decodeAmount(account.totalAmount),
    amountClaimed: decodeAmount(account.amountClaimed),
    unlockedAmount: computeUnlocked(account),
    claimableAmount: computeClaimable(account),
    startTimestamp: Number(account.startTimestamp.toString()),
    endTimestamp: Number(account.endTimestamp.toString()),
    cliffTimestamp: Number(account.cliffTimestamp.toString()),
    milestoneReleased: account.milestoneReleased,
    releaseAuthority: account.releaseAuthority,
    isCancellable: account.isCancellable,
  };
}

export function VeloraChainProvider({ children }: { children: ReactNode }) {
  const [walletPublicKey, setWalletPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<StreamView[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const connection = useMemo(() => new Connection(DEVNET_RPC_URL, "confirmed"), []);

  const phantom = getPhantom();
  const wallet = useMemo(() => {
    if (!phantom || !walletPublicKey) return null;
    return {
      publicKey: walletPublicKey,
      signTransaction: phantom.signTransaction.bind(phantom),
      signAllTransactions: phantom.signAllTransactions.bind(phantom),
    };
  }, [phantom, walletPublicKey]);
  const provider = useMemo(() => (wallet ? new AnchorProvider(connection, wallet, { commitment: "confirmed" }) : null), [connection, wallet]);
  const program = useMemo(() => (provider ? new Program(veloraIdl, provider) : null), [provider]);

  const connect = useCallback(async () => {
    const walletProvider = getPhantom();
    if (!walletProvider) {
      setError("Phantom wallet is required for this devnet prototype.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const response = await walletProvider.connect();
      setWalletPublicKey(response.publicKey);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await getPhantom()?.disconnect();
    setWalletPublicKey(null);
    setStreams([]);
  }, []);

  useEffect(() => {
    const walletProvider = getPhantom();
    if (!walletProvider) return;

    void walletProvider
      .connect({ onlyIfTrusted: true })
      .then((response) => setWalletPublicKey(response.publicKey))
      .catch(() => {
        setWalletPublicKey(null);
      });

    walletProvider.on?.("connect", (publicKey) => setWalletPublicKey(publicKey ?? walletProvider.publicKey ?? null));
    walletProvider.on?.("disconnect", () => {
      setWalletPublicKey(null);
      setStreams([]);
    });
    walletProvider.on?.("accountChanged", (publicKey) => {
      setWalletPublicKey(publicKey ?? null);
      if (!publicKey) setStreams([]);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!program || !walletPublicKey) {
      setStreams([]);
      return;
    }
    setLoadingStreams(true);
    setError(null);
    try {
      const streamProgram = program as Program<Idl> & {
        account: {
          streamConfig: {
            all: () => Promise<Array<{ publicKey: PublicKey; account: unknown }>>;
          };
        };
      };
      const allStreams = await streamProgram.account.streamConfig.all();
      const normalized = allStreams
        .map((item: { publicKey: PublicKey; account: unknown }) => normalizeStream(item.publicKey, item.account as StreamAccount))
        .filter((stream: StreamView) => stream.creator.equals(walletPublicKey) || stream.recipient.equals(walletPublicKey))
        .sort((a: StreamView, b: StreamView) => Number(BigInt(b.streamId) - BigInt(a.streamId)));
      setStreams(normalized);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not load devnet streams.");
    } finally {
      setLoadingStreams(false);
    }
  }, [program, walletPublicKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const ensureConnected = useCallback(async () => {
    const currentProgram = program;
    let currentWallet = walletPublicKey;

    if (!currentProgram || !currentWallet) {
      await connect();
      // Re-read from Phantom directly to avoid stale closure after async connect
      const walletProvider = getPhantom();
      if (!walletProvider?.publicKey) throw new Error("Connect your wallet first.");
      currentWallet = walletProvider.publicKey;
      if (!currentProgram) throw new Error("Program not initialized. Try refreshing.");
    }
    return { currentProgram, currentWallet };
  }, [connect, program, walletPublicKey]);

  const ensureAssociatedTokenAccount = useCallback(
    async (owner: PublicKey, mint: PublicKey) => {
      if (!provider || !walletPublicKey) throw new Error("Connect your wallet first.");
      const tokenAccount = getAssociatedTokenAddressSync(mint, owner, true);
      const info = await connection.getAccountInfo(tokenAccount, "confirmed");
      if (!info) {
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(walletPublicKey, tokenAccount, owner, mint),
        );
        await provider.sendAndConfirm(transaction);
      }
      return tokenAccount;
    },
    [connection, provider, walletPublicKey],
  );

  const getWalletTokenBalance = useCallback(
    async (mint: PublicKey) => {
      if (!walletPublicKey) return null;
      const tokenAccount = getAssociatedTokenAddressSync(mint, walletPublicKey, true);
      const info = await connection.getAccountInfo(tokenAccount, "confirmed");
      if (!info) return null;
      const balance = await connection.getTokenAccountBalance(tokenAccount, "confirmed");
      return {
        tokenAccount,
        amount: BigInt(balance.value.amount),
      };
    },
    [connection, walletPublicKey],
  );

  const createStream = useCallback(
    async (input: CreateStreamInput) => {
      const { currentProgram, currentWallet } = await ensureConnected();
      const streamConfig = deriveStream(currentWallet, input.recipient, input.streamId);
      const vault = deriveVault(streamConfig);
      const creatorTokenAccount = getAssociatedTokenAddressSync(input.mint, currentWallet, true);
      const creatorTokenAccountInfo = await connection.getAccountInfo(creatorTokenAccount, "confirmed");

      if (!creatorTokenAccountInfo) {
        throw new Error("The connected wallet does not have a token account for this mint yet.");
      }
      // Early detection of owner mismatch (the root cause of SPL Token 0x4)
      {
        const onChainOwner = new PublicKey(creatorTokenAccountInfo.data.slice(32, 64));
        if (!onChainOwner.equals(currentWallet)) {
          throw new Error(
            `Token account owner mismatch. Account ${creatorTokenAccount.toBase58()} is owned by ${onChainOwner.toBase58()} but your wallet is ${currentWallet.toBase58()}. ` +
            `This happens when faucet tokens were sent to a different wallet. Disconnect and reconnect the correct wallet, then try again.`
          );
        }
      }
      const creatorBalance = await connection.getTokenAccountBalance(creatorTokenAccount, "confirmed");
      if (BigInt(creatorBalance.value.amount) < input.totalAmount) {
        throw new Error("The connected wallet does not have enough tokens for this vesting amount.");
      }
      await ensureAssociatedTokenAccount(input.recipient, input.mint);

      const signature = await humanizeError(currentProgram.methods
        .createStream({
          streamId: new BN(input.streamId.toString()),
          totalAmount: new BN(input.totalAmount.toString()),
          startTimestamp: new BN(input.startTimestamp),
          endTimestamp: new BN(input.endTimestamp),
          cliffTimestamp: new BN(input.cliffTimestamp),
          cliffAmount: new BN(input.cliffAmount.toString()),
          scheduleType: scheduleToAnchor(input.scheduleType),
          authorityType: authorityTypeToAnchor(input.authorityType),
          releaseAuthority: input.releaseAuthority ?? null,
          milestoneDescription: descriptionToBytes(input.milestoneDescription),
          isCancellable: input.isCancellable,
          cancelAuthority: cancelAuthorityToAnchor(input.cancelAuthority),
        })
        .accounts({
          creator: currentWallet,
          recipient: input.recipient,
          mint: input.mint,
          streamConfig,
          vault,
          creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc());

      await refresh();
      return {
        signature,
        streamConfig,
        streamId: input.streamId,
        creator: currentWallet,
        recipient: input.recipient,
      };
    },
    [connection, ensureAssociatedTokenAccount, ensureConnected, refresh],
  );

  const withdraw = useCallback(
    async (stream: StreamView) => {
      const { currentProgram, currentWallet } = await ensureConnected();
      const recipientTokenAccount = await ensureAssociatedTokenAccount(currentWallet, stream.mint);
      const signature = await humanizeError(currentProgram.methods
        .withdraw()
        .accounts({
          recipient: currentWallet,
          streamConfig: stream.publicKey,
          vault: stream.vault,
          recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc());
      setStreams((current) =>
        current.map((item) => {
          if (!item.publicKey.equals(stream.publicKey)) return item;
          const nextClaimed = item.amountClaimed + item.claimableAmount;
          const cappedClaimed = nextClaimed > item.totalAmount ? item.totalAmount : nextClaimed;
          return {
            ...item,
            amountClaimed: cappedClaimed,
            claimableAmount: BigInt(0),
            status: cappedClaimed >= item.totalAmount ? "Completed" : item.status,
          };
        }),
      );
      window.setTimeout(() => void refresh(), 1200);
      return signature;
    },
    [ensureAssociatedTokenAccount, ensureConnected, refresh],
  );

  const cancel = useCallback(
    async (stream: StreamView) => {
      const { currentProgram, currentWallet } = await ensureConnected();
      const recipientTokenAccount = getAssociatedTokenAddressSync(stream.mint, stream.recipient, true);
      const creatorTokenAccount = await ensureAssociatedTokenAccount(currentWallet, stream.mint);
      const signature = await humanizeError(currentProgram.methods
        .cancel()
        .accounts({
          authority: currentWallet,
          streamConfig: stream.publicKey,
          vault: stream.vault,
          recipientTokenAccount,
          creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc());
      await refresh();
      return signature;
    },
    [ensureAssociatedTokenAccount, ensureConnected, refresh],
  );

  const releaseMilestone = useCallback(
    async (stream: StreamView) => {
      const { currentProgram, currentWallet } = await ensureConnected();
      const signature = await humanizeError(currentProgram.methods
        .releaseMilestone()
        .accounts({ authority: currentWallet, streamConfig: stream.publicKey })
        .rpc());
      await refresh();
      return signature;
    },
    [ensureConnected, refresh],
  );

  const value = useMemo(
    () => ({
      connection,
      walletPublicKey,
      walletLabel: shortKey(walletPublicKey),
      connecting,
      error,
      connect,
      disconnect,
      refresh,
      getWalletTokenBalance,
      streams,
      loadingStreams,
      createStream,
      withdraw,
      cancel,
      releaseMilestone,
    }),
    [
      cancel,
      connect,
      connecting,
      connection,
      createStream,
      disconnect,
      error,
      getWalletTokenBalance,
      loadingStreams,
      refresh,
      releaseMilestone,
      streams,
      walletPublicKey,
      withdraw,
    ],
  );

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export function useVeloraChain() {
  const value = useContext(ChainContext);
  if (!value) throw new Error("useVeloraChain must be used inside VeloraChainProvider.");
  return value;
}

export function formatTokenAmount(amount: bigint) {
  return amount.toLocaleString("en-US");
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

export function parsePublicKey(value: string, label: string) {
  try {
    return new PublicKey(value.trim());
  } catch {
    throw new Error(`${label} must be a valid Solana address.`);
  }
}

export function parseRawAmount(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error("Amount must be a whole raw token-unit number.");
  const amount = BigInt(trimmed);
  if (amount <= BigInt(0)) throw new Error("Amount must be greater than zero.");
  return amount;
}

/**
 * Parse a raw token amount that is allowed to be zero (e.g. cliff lump-sum).
 * A zero cliff amount is valid — a CliffLinear stream with cliffAmount=0 simply
 * vests linearly from the cliff. The strict {@link parseRawAmount} rejects zero,
 * so it must not be used for these optional amount fields.
 */
export function parseRawAmountAllowZero(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error("Amount must be a whole raw token-unit number.");
  return BigInt(trimmed);
}

export { PROGRAM_ID, ZERO_PUBKEY };
