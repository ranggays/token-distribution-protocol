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
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
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
  scheduleType: StreamView["scheduleType"];
  milestoneDescription: string;
  isCancellable: boolean;
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

function computeClaimable(stream: StreamAccount) {
  if (enumName(stream.status, "Active") !== "Active") return BigInt(0);

  const now = Math.floor(Date.now() / 1000);
  const total = decodeAmount(stream.totalAmount);
  const claimed = decodeAmount(stream.amountClaimed);
  const start = Number(stream.startTimestamp.toString());
  const end = Number(stream.endTimestamp.toString());
  const cliff = Number(stream.cliffTimestamp.toString());
  const schedule = enumName(stream.scheduleType, "Linear");
  let unlocked = BigInt(0);

  if (schedule === "Milestone") {
    unlocked = stream.milestoneReleased ? total : BigInt(0);
  } else {
    const linearStart = schedule === "Cliff" || schedule === "CliffLinear" ? cliff : start;
    if (now <= linearStart) unlocked = BigInt(0);
    else if (now >= end) unlocked = total;
    else unlocked = (total * BigInt(now - linearStart)) / BigInt(end - linearStart);
  }

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
    if (!program || !walletPublicKey) {
      await connect();
    }
    const currentProgram = program;
    const currentWallet = walletPublicKey;
    if (!currentProgram || !currentWallet) throw new Error("Connect your wallet first.");
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
      const creatorBalance = await connection.getTokenAccountBalance(creatorTokenAccount, "confirmed");
      if (BigInt(creatorBalance.value.amount) < input.totalAmount) {
        throw new Error("The connected wallet does not have enough tokens for this vesting amount.");
      }
      await ensureAssociatedTokenAccount(input.recipient, input.mint);

      const signature = await currentProgram.methods
        .createStream({
          streamId: new BN(input.streamId.toString()),
          totalAmount: new BN(input.totalAmount.toString()),
          startTimestamp: new BN(input.startTimestamp),
          endTimestamp: new BN(input.endTimestamp),
          cliffTimestamp: new BN(input.cliffTimestamp),
          cliffAmount: new BN(0),
          scheduleType: scheduleToAnchor(input.scheduleType),
          authorityType: { none: {} },
          releaseAuthority: input.scheduleType === "Milestone" ? currentWallet : null,
          milestoneDescription: descriptionToBytes(input.milestoneDescription),
          isCancellable: input.isCancellable,
          cancelAuthority: { creatorOnly: {} },
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
        .rpc();

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
      const signature = await currentProgram.methods
        .withdraw()
        .accounts({
          recipient: currentWallet,
          streamConfig: stream.publicKey,
          vault: stream.vault,
          recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await refresh();
      return signature;
    },
    [ensureAssociatedTokenAccount, ensureConnected, refresh],
  );

  const cancel = useCallback(
    async (stream: StreamView) => {
      const { currentProgram, currentWallet } = await ensureConnected();
      const recipientTokenAccount = getAssociatedTokenAddressSync(stream.mint, stream.recipient, true);
      const creatorTokenAccount = await ensureAssociatedTokenAccount(currentWallet, stream.mint);
      const signature = await currentProgram.methods
        .cancel()
        .accounts({
          authority: currentWallet,
          streamConfig: stream.publicKey,
          vault: stream.vault,
          recipientTokenAccount,
          creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await refresh();
      return signature;
    },
    [ensureAssociatedTokenAccount, ensureConnected, refresh],
  );

  const releaseMilestone = useCallback(
    async (stream: StreamView) => {
      const { currentProgram, currentWallet } = await ensureConnected();
      const signature = await currentProgram.methods
        .releaseMilestone()
        .accounts({ authority: currentWallet, streamConfig: stream.publicKey })
        .rpc();
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

export { PROGRAM_ID, ZERO_PUBKEY };
