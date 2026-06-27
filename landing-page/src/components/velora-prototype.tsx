"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Copy,
  FileText,
  Filter,
  HelpCircle,
  Home,
  Hourglass,
  Info,
  ListFilter,
  LogOut,
  Lock,
  Menu,
  MoreHorizontal,
  PackageOpen,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Timer,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatDate,
  formatTokenAmount,
  parsePublicKey,
  parseRawAmount,
  parseRawAmountAllowZero,
  useVeloraChain,
  type CreateStreamInput,
  type StreamView,
  type TokenBalance,
} from "@/lib/velora-chain";

const veloraLogoSrc = "/images/velora/icons/velora4.webp";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: string;
};

const mainNav: NavItem[] = [
  { label: "Home", href: "/app", icon: Home, match: "/app" },
  { label: "Vesting", href: "/vesting", icon: Timer, match: "/vesting" },
  { label: "Claim", href: "/claim", icon: PackageOpen },
];

const quickActions = [
  { label: "Linear vesting", icon: CalendarDays, href: "/create-vesting/type" },
  { label: "Cliff vesting", icon: Lock, href: "/create-vesting/type" },
  { label: "Claim assets", icon: PackageOpen, href: "/claim" },
];

const getStartedActions = [
  {
    title: "Create vesting",
    description: "Configure token, schedule, recipients, and permissions in one guided flow.",
    href: "/create-vesting/type",
    icon: CalendarDays,
    action: "Start setup",
  },
  {
    title: "Review contracts",
    description: "See created vesting contracts, their recipients, dates, and status.",
    href: "/vesting",
    icon: Timer,
    action: "Open vesting",
  },
  {
    title: "Claim assets",
    description: "Check recipient-side contracts that are ready to be claimed.",
    href: "/claim",
    icon: PackageOpen,
    action: "View claims",
  },
];

const protocolTutorialSteps = [
  {
    eyebrow: "Start here",
    title: "Connect your wallet",
    description:
      "Use the wallet button in the top bar to connect a Solana wallet. Velora reads created streams and claimable vesting from the connected address.",
    points: ["Creators use it to fund and manage vesting streams.", "Recipients use it to find allocations that can be claimed."],
    href: "/app",
    action: "Open dashboard",
  },
  {
    eyebrow: "Creator flow",
    title: "Choose the vesting type",
    description:
      "Start the create stream flow and select the schedule model that fits the distribution, such as linear vesting or cliff vesting.",
    points: ["This defines how tokens unlock over time.", "The next screens keep the setup focused on one stream."],
    href: "/create-vesting/type",
    action: "Choose type",
  },
  {
    eyebrow: "Creator flow",
    title: "Configure vesting details",
    description:
      "Set token information, start date, end date, unlock cadence, and stream permissions before adding recipients.",
    points: ["Configuration controls the on-chain schedule.", "Review token and timing values carefully before moving on."],
    href: "/create-vesting/configuration",
    action: "Configure",
  },
  {
    eyebrow: "Creator flow",
    title: "Add recipients and review",
    description:
      "Add recipient wallet addresses, assign token amounts, then review the complete stream before submitting the transaction.",
    points: ["The review step is the final check before wallet approval.", "Created streams can be monitored from the vesting page."],
    href: "/create-vesting/recipients",
    action: "Add recipients",
  },
  {
    eyebrow: "Creator flow",
    title: "Manage or cancel streams",
    description:
      "Open the vesting page to inspect created streams. If a stream should no longer continue, use the cancel action from the creator-side view.",
    points: ["Canceled streams stop recipient claims in the app.", "The vesting page stays focused on creator-owned streams."],
    href: "/vesting",
    action: "Manage vesting",
  },
  {
    eyebrow: "Recipient flow",
    title: "Claim vested tokens",
    description:
      "Recipients connect their wallet, open the claim page, and withdraw available tokens from active streams as the schedule unlocks.",
    points: ["Only currently claimable amounts are actionable.", "Claiming requires wallet approval for the withdrawal transaction."],
    href: "/claim",
    action: "Open claims",
  },
];

const sidebarCollapsedStorageKey = "velora-sidebar-collapsed";
const sidebarCollapsedEvent = "velora-sidebar-collapsed";

type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

const unlockScheduleOptions: SelectOption[] = [
  { label: "Monthly", value: "Monthly" },
  { label: "Weekly", value: "Weekly" },
  { label: "Daily", value: "Daily" },
  { label: "Quarterly", value: "Quarterly" },
];

const recipientChangeOptions: SelectOption[] = [
  { label: "Only Sender", value: "Only Sender" },
  { label: "Only Recipient", value: "Only Recipient" },
  { label: "Both Sender and Recipient", value: "Both Sender and Recipient" },
];

const authorityTypeOptions: SelectOption[] = [
  { label: "None", value: "None" },
  { label: "Single key", value: "SingleKey" },
  { label: "MultiSig (coming later)", value: "MultiSig", disabled: true },
];

const cancelAuthorityOptions: SelectOption[] = [
  { label: "Creator only", value: "CreatorOnly" },
  { label: "Creator or recipient", value: "Either" },
  { label: "Neither", value: "Neither" },
];

const veloraDevnetMint = "2izHDnU4RsQRDMpHTTrsjCwbzS3XDXBRStqtWosfVf6j";
const tokenOptions: SelectOption[] = [
  { label: "Velora Test Token", value: "velora-test" },
  { label: "Custom SPL mint", value: "custom" },
];

type VestingDraft = {
  contractTitle: string;
  scheduleType: StreamView["scheduleType"];
  tokenPreset: string;
  tokenMint: string;
  recipients: VestingRecipient[];
  startDateTime: string;
  endDateTime: string;
  cliffDateTime: string;
  duration: number;
  durationUnit: string;
  startsImmediately: boolean;
  cliffEnabled: boolean;
  cliffDelayDays: number;
  milestoneDescription: string;
  cancellable: boolean;
  cliffAmount: string;
  authorityType: "None" | "SingleKey" | "MultiSig";
  releaseAuthorityWallet: string;
  cancelAuthority: "CreatorOnly" | "Either" | "Neither";
};

type VestingRecipient = {
  id: string;
  title: string;
  wallet: string;
  amount: string;
  source: "manual" | "csv" | "legacy";
};

type TransactionStage = "idle" | "wallet_approval" | "sending" | "confirming" | "success" | "error";

function transactionStageLabel(stage: TransactionStage) {
  if (stage === "wallet_approval") return "Approve in wallet...";
  if (stage === "sending") return "Sending transaction...";
  if (stage === "confirming") return "Confirming on devnet...";
  if (stage === "success") return "Transaction confirmed.";
  if (stage === "error") return "Transaction failed.";
  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const vestingDraftStorageKey = "velora-vesting-draft";
const vestingMetadataStorageKey = "velora-vesting-metadata";
const vestingMetadataEvent = "velora-vesting-metadata";

const defaultVestingDraft: VestingDraft = {
  contractTitle: "Vesting stream",
  scheduleType: "Linear",
  tokenPreset: "velora-test",
  tokenMint: veloraDevnetMint,
  recipients: [],
  startDateTime: "",
  endDateTime: "",
  cliffDateTime: "",
  duration: 12,
  durationUnit: "Month",
  startsImmediately: true,
  cliffEnabled: false,
  cliffDelayDays: 30,
  milestoneDescription: "",
  cancellable: true,
  cliffAmount: "0",
  authorityType: "None",
  releaseAuthorityWallet: "",
  cancelAuthority: "CreatorOnly",
};

function createRecipientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeRecipient(value: unknown, fallbackSource: VestingRecipient["source"]): VestingRecipient | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<VestingRecipient>;
  const wallet = typeof record.wallet === "string" ? record.wallet : "";
  const amount = typeof record.amount === "string" ? record.amount : "";
  if (!wallet.trim() && !amount.trim()) return null;
  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : createRecipientId(),
    title: typeof record.title === "string" && record.title.trim() ? record.title : "Vesting stream",
    wallet,
    amount,
    source: record.source === "csv" || record.source === "manual" || record.source === "legacy" ? record.source : fallbackSource,
  };
}

function migrateVestingDraft(parsed: Partial<VestingDraft> & { recipient?: unknown; amount?: unknown }) {
  const recipients = Array.isArray(parsed.recipients)
    ? parsed.recipients
        .map((recipient) => normalizeRecipient(recipient, "manual"))
        .filter((recipient): recipient is VestingRecipient => Boolean(recipient))
    : [];

  if (!recipients.length && typeof parsed.recipient === "string" && typeof parsed.amount === "string" && (parsed.recipient.trim() || parsed.amount.trim())) {
    recipients.push({
      id: createRecipientId(),
      title: typeof parsed.contractTitle === "string" && parsed.contractTitle.trim() ? parsed.contractTitle : "Vesting stream",
      wallet: parsed.recipient,
      amount: parsed.amount,
      source: "legacy",
    });
  }

  return {
    ...defaultVestingDraft,
    ...parsed,
    recipients,
  };
}

function dateToLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date and time.`);
  return timestamp;
}

function formatDraftDate(value: string) {
  if (!value) return "Not set";
  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isFinite(timestamp)) return "Invalid date";
  return formatDate(timestamp);
}

function defaultCliffDateTime(draft: VestingDraft) {
  const start = draft.startDateTime ? new Date(draft.startDateTime) : new Date();
  const end = draft.endDateTime ? new Date(draft.endDateTime) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const midpoint = new Date(start.getTime() + Math.max(60 * 60 * 1000, Math.floor((end.getTime() - start.getTime()) / 3)));
  return dateToLocalInputValue(midpoint < end ? midpoint : new Date(start.getTime() + 24 * 60 * 60 * 1000));
}

function withDraftDateDefaults(draft: VestingDraft) {
  if (draft.startDateTime && draft.endDateTime) return draft;
  const now = new Date();
  const start = new Date(now.getTime() + 10 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    ...draft,
    startDateTime: draft.startDateTime || dateToLocalInputValue(start),
    endDateTime: draft.endDateTime || dateToLocalInputValue(end),
  };
}

function readVestingDraft(): VestingDraft {
  if (typeof window === "undefined") return defaultVestingDraft;
  try {
    const parsed = JSON.parse(localStorage.getItem(vestingDraftStorageKey) ?? "{}") as Partial<VestingDraft> & { recipient?: unknown; amount?: unknown };
    const draft = migrateVestingDraft(parsed);
    return withDraftDateDefaults(draft);
  } catch {
    return withDraftDateDefaults(defaultVestingDraft);
  }
}

function saveVestingDraft(draft: VestingDraft) {
  localStorage.setItem(vestingDraftStorageKey, JSON.stringify(draft));
}

function useVestingDraft() {
  const [draft, setDraftState] = useState<VestingDraft>(defaultVestingDraft);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraftState(readVestingDraft()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setDraft = (patch: Partial<VestingDraft>) => {
    setDraftState((current) => {
      const next = { ...current, ...patch };
      saveVestingDraft(next);
      return next;
    });
  };

  return { draft, setDraft };
}

type VestingMetadata = {
  title: string;
};

type VestingMetadataMap = Record<string, VestingMetadata>;

const emptyVestingMetadataSnapshot: VestingMetadataMap = {};
let cachedVestingMetadataRaw: string | null = null;
let cachedVestingMetadataSnapshot: VestingMetadataMap = emptyVestingMetadataSnapshot;

function streamMetadataKey(stream: Pick<StreamView, "creator" | "recipient" | "streamId">) {
  return `${stream.creator.toBase58()}:${stream.recipient.toBase58()}:${stream.streamId}`;
}

function readVestingMetadataSnapshot(): VestingMetadataMap {
  if (typeof window === "undefined") return emptyVestingMetadataSnapshot;
  try {
    const raw = localStorage.getItem(vestingMetadataStorageKey) ?? "{}";
    if (raw === cachedVestingMetadataRaw) return cachedVestingMetadataSnapshot;
    cachedVestingMetadataRaw = raw;
    cachedVestingMetadataSnapshot = JSON.parse(raw) as VestingMetadataMap;
    return cachedVestingMetadataSnapshot;
  } catch {
    cachedVestingMetadataRaw = null;
    cachedVestingMetadataSnapshot = emptyVestingMetadataSnapshot;
    return cachedVestingMetadataSnapshot;
  }
}

function readVestingMetadataServerSnapshot(): VestingMetadataMap {
  return emptyVestingMetadataSnapshot;
}

function subscribeToVestingMetadataStore(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(vestingMetadataEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(vestingMetadataEvent, onStoreChange);
  };
}

function saveVestingMetadata(keys: string[], metadata: VestingMetadata) {
  const current = readVestingMetadataSnapshot();
  const next = keys.reduce<VestingMetadataMap>(
    (items, key) => ({
      ...items,
      [key]: metadata,
    }),
    { ...current },
  );
  localStorage.setItem(vestingMetadataStorageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(vestingMetadataEvent));
}

function useVestingMetadata() {
  return useSyncExternalStore(
    subscribeToVestingMetadataStore,
    readVestingMetadataSnapshot,
    readVestingMetadataServerSnapshot,
  );
}

function streamTitle(stream: StreamView, metadata: VestingMetadataMap) {
  return metadata[stream.publicKey.toBase58()]?.title || metadata[streamMetadataKey(stream)]?.title || `Stream #${stream.streamId}`;
}

function scheduleLabel(scheduleType: StreamView["scheduleType"]) {
  return scheduleType === "CliffLinear" ? "Hybrid" : scheduleType;
}

function hasCliffDate(scheduleType: StreamView["scheduleType"]) {
  return scheduleType === "Cliff" || scheduleType === "CliffLinear";
}

function scheduleDescription(draft: VestingDraft) {
  if (draft.scheduleType === "Cliff") return "All tokens unlock at the cliff date.";
  if (draft.scheduleType === "CliffLinear") return `${draft.cliffAmount || "0"} tokens unlock at the cliff, then the rest vests linearly.`;
  if (draft.scheduleType === "Milestone") return "Tokens unlock after manual milestone release.";
  return "Tokens vest linearly from start to end.";
}

function claimActionLabel(stream: StreamView, isBusy: boolean) {
  if (isBusy) return "Claiming...";
  if (stream.status !== "Active") return streamStatusLabel(stream);
  if (stream.amountClaimed >= stream.totalAmount) return "Completed";
  if (stream.claimableAmount === BigInt(0)) return "No claim";
  return "Claim";
}

function streamStatusLabel(stream: StreamView) {
  if (stream.status === "Cancelled") return "Canceled";
  if (stream.status === "Completed") return "Completed";
  const now = Math.floor(Date.now() / 1000);
  return stream.startTimestamp > now ? "Scheduled" : "Ongoing";
}

function formatTimeDistance(seconds: number) {
  const absSeconds = Math.max(0, seconds);
  const days = Math.floor(absSeconds / 86_400);
  const hours = Math.floor((absSeconds % 86_400) / 3_600);
  const minutes = Math.floor((absSeconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function timeRemainingLabel(stream: StreamView) {
  if (stream.status === "Cancelled") return "Canceled";
  if (stream.status === "Completed") return "Completed";
  const now = Math.floor(Date.now() / 1000);
  if (now < stream.startTimestamp) return `Starts in ${formatTimeDistance(stream.startTimestamp - now)}`;
  if (now >= stream.endTimestamp) return "Ended";
  return formatTimeDistance(stream.endTimestamp - now);
}

function matchesTab(stream: StreamView, tab: string) {
  return tab === "All" || streamStatusLabel(stream) === tab;
}

const analyticsChartConfig = {
  ongoing: { label: "Ongoing", color: "#f2d467" },
  scheduled: { label: "Scheduled", color: "#6ea8ff" },
  completed: { label: "Completed", color: "#5ee2a0" },
  canceled: { label: "Canceled", color: "#ff6b5d" },
  total: { label: "Total", color: "#f2d467" },
  claimed: { label: "Claimed", color: "#5ee2a0" },
  claimable: { label: "Claimable", color: "#f2d467" },
  locked: { label: "Locked", color: "#6ea8ff" },
} satisfies ChartConfig;

function chartAmount(value: bigint) {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  if (value > maxSafe) return Number.MAX_SAFE_INTEGER;
  return Number(value);
}

function chartValueLabel(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("en-US") : String(value ?? "0");
}

function tokenLabel(draft: VestingDraft) {
  if (draft.tokenPreset === "velora-test") return "Velora Test Token";
  return draft.tokenMint ? "Custom SPL token" : "Not set";
}

function shortenAddress(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function subscribeToHydrationStore() {
  return () => {};
}

function readHydrationSnapshot() {
  return true;
}

function readHydrationServerSnapshot() {
  return false;
}

function useHydrated() {
  return useSyncExternalStore(subscribeToHydrationStore, readHydrationSnapshot, readHydrationServerSnapshot);
}

type TokenBalanceState = {
  status: "idle" | "loading" | "ready" | "missing" | "invalid" | "error";
  balance: TokenBalance | null;
  message: string;
};

type TokenBalanceResult = TokenBalanceState & {
  refresh: () => void;
};

function useSelectedTokenBalance(tokenMint: string) {
  const { walletPublicKey, getWalletTokenBalance } = useVeloraChain();
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [state, setState] = useState<TokenBalanceState>({
    status: "idle",
    balance: null,
    message: "Connect wallet to check token balance.",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (!walletPublicKey) {
        setState({ status: "idle", balance: null, message: "Connect wallet to check token balance." });
        return;
      }

      if (!tokenMint.trim()) {
        setState({ status: "invalid", balance: null, message: "Choose a token first." });
        return;
      }

      setState((current) => ({ ...current, status: "loading", message: "Checking wallet balance..." }));

      try {
        const mint = parsePublicKey(tokenMint, "SPL mint");
        const balance = await getWalletTokenBalance(mint);
        if (cancelled) return;

        if (!balance) {
          setState({
            status: "missing",
            balance: null,
            message: "This wallet does not hold this token yet.",
          });
          return;
        }

        setState({
          status: "ready",
          balance,
          message: `Balance: ${formatTokenAmount(balance.amount)} tokens`,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: error instanceof Error && error.message.includes("valid Solana address") ? "invalid" : "error",
          balance: null,
          message: error instanceof Error ? error.message : "Could not check token balance.",
        });
      }
    }

    void loadBalance();

    return () => {
      cancelled = true;
    };
  }, [getWalletTokenBalance, refreshIndex, tokenMint, walletPublicKey]);

  return {
    ...state,
    refresh: () => setRefreshIndex((current) => current + 1),
  };
}

function getRecipientsTotalAmount(recipients: VestingRecipient[]) {
  try {
    if (!recipients.length) return null;
    return recipients.reduce((total, recipient) => total + parseRawAmount(recipient.amount), BigInt(0));
  } catch {
    return null;
  }
}

function getRecipientIssue(recipient: VestingRecipient) {
  if (!recipient.amount.trim()) return "Enter an amount.";
  try {
    parseRawAmount(recipient.amount);
  } catch (error) {
    return error instanceof Error ? error.message : "Enter a valid token amount.";
  }

  if (!recipient.wallet.trim()) return "Enter a recipient wallet.";
  try {
    parsePublicKey(recipient.wallet, "Recipient wallet");
  } catch (error) {
    return error instanceof Error ? error.message : "Enter a valid recipient wallet.";
  }

  return null;
}

function getValidRecipientCount(recipients: VestingRecipient[]) {
  return recipients.filter((recipient) => !getRecipientIssue(recipient)).length;
}

function getBalanceIssue(balanceState: TokenBalanceState, requiredAmount: bigint | null) {
  if (balanceState.status === "loading") return "Checking wallet balance...";
  if (balanceState.status === "idle") return balanceState.message;
  if (balanceState.status === "missing" || balanceState.status === "invalid" || balanceState.status === "error") return balanceState.message;
  if (!requiredAmount) return "Enter a valid token amount.";
  if (!balanceState.balance || balanceState.balance.amount < requiredAmount) return "Insufficient token balance for this amount.";
  return null;
}

function getScheduleIssue(draft: VestingDraft) {
  if (!draft.endDateTime) return draft.scheduleType === "Milestone" ? "Choose a milestone release deadline." : "Choose a vesting end date.";

  if (draft.scheduleType !== "Milestone" && !draft.startsImmediately && !draft.startDateTime) return "Choose a vesting start date.";

  const startTimestamp = draft.scheduleType === "Milestone" || draft.startsImmediately ? Math.floor(Date.now() / 1000) : Math.floor(new Date(draft.startDateTime).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(draft.endDateTime).getTime() / 1000);
  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) return "Choose valid vesting dates.";
  if (endTimestamp <= startTimestamp) return draft.scheduleType === "Milestone" ? "Release deadline must be in the future." : "Vesting end date must be after the start date.";

  if (hasCliffDate(draft.scheduleType)) {
    if (!draft.cliffDateTime) return "Choose a cliff date.";
    const cliffTimestamp = Math.floor(new Date(draft.cliffDateTime).getTime() / 1000);
    if (!Number.isFinite(cliffTimestamp)) return "Choose a valid cliff date.";
    if (cliffTimestamp <= startTimestamp || cliffTimestamp >= endTimestamp) {
      return "Cliff date must be after the start date and before the end date.";
    }
  }

  if (draft.scheduleType === "CliffLinear") {
    try {
      const cliffAmount = parseRawAmountAllowZero(draft.cliffAmount);
      const totalAmount = getRecipientsTotalAmount(draft.recipients);
      if (!totalAmount) return "Enter at least one valid recipient amount.";
      if (cliffAmount > totalAmount) return "Hybrid cliff amount must be less than or equal to the total amount.";
    } catch {
      return "Enter a valid whole-number hybrid cliff amount.";
    }
  }

  if (draft.scheduleType === "Milestone" && draft.authorityType === "MultiSig") return "MultiSig release authority is coming later.";

  if (draft.scheduleType === "Milestone" && draft.authorityType === "SingleKey") {
    if (!draft.releaseAuthorityWallet.trim()) return "Enter the release authority wallet.";
    try {
      parsePublicKey(draft.releaseAuthorityWallet, "Release authority wallet");
    } catch (error) {
      return error instanceof Error ? error.message : "Enter a valid release authority wallet.";
    }
  }

  return null;
}

function BalanceNotice({ state, issue }: { state: TokenBalanceResult; issue?: string | null }) {
  const { walletPublicKey, connecting, connect } = useVeloraChain();
  const [faucetStatus, setFaucetStatus] = useState<"idle" | "minting" | "success" | "error">("idle");
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);
  const hasIssue = Boolean(issue) || state.status === "missing" || state.status === "invalid" || state.status === "error";
  const hasZeroBalance = state.status === "ready" && state.balance && state.balance.amount === BigInt(0);
  const showFaucetAction = walletPublicKey && (state.status === "missing" || hasZeroBalance || issue === "Insufficient token balance for this amount.");

  const requestTestTokens = async () => {
    if (!walletPublicKey) return;
    setFaucetStatus("minting");
    setFaucetMessage(null);

    try {
      const response = await fetch("/api/devnet-faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: walletPublicKey.toBase58() }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error ?? "Could not mint test tokens.");
      }

      setFaucetStatus("success");
      setFaucetMessage("Test tokens added. Rechecking balance...");
      state.refresh();
    } catch (error) {
      setFaucetStatus("error");
      setFaucetMessage(error instanceof Error ? error.message : "Could not mint test tokens.");
    }
  };

  return (
    <FieldCard className={`flex flex-col gap-3 p-4 text-sm ${hasIssue ? "text-amber-200" : "text-[#fffeea]/62"}`}>
      <div className="flex items-center justify-between gap-4">
        <span>{issue ?? state.message}</span>
        {!walletPublicKey ? (
          <button className="shrink-0 text-sm font-semibold text-[#f2d467]" disabled={connecting} onClick={() => void connect()} type="button">
            {connecting ? "Connecting..." : "Connect wallet"}
          </button>
        ) : null}
        {showFaucetAction ? (
          <button
            className="shrink-0 rounded-[4px] border border-[#f2d467]/35 px-3 py-1.5 text-xs font-semibold text-[#f2d467] transition hover:bg-[#f2d467]/10"
            disabled={faucetStatus === "minting"}
            onClick={() => void requestTestTokens()}
            type="button"
          >
            {faucetStatus === "minting" ? "Minting..." : "Get test tokens"}
          </button>
        ) : null}
      </div>
      {faucetMessage ? (
        <p className={`text-xs leading-5 ${faucetStatus === "error" ? "text-red-300" : "text-[#fffeea]/50"}`}>
          {faucetMessage}
        </p>
      ) : null}
    </FieldCard>
  );
}

function readSidebarCollapsedSnapshot() {
  return localStorage.getItem(sidebarCollapsedStorageKey) === "true";
}

function readSidebarCollapsedServerSnapshot() {
  return false;
}

function subscribeToSidebarCollapsedStore(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(sidebarCollapsedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(sidebarCollapsedEvent, onStoreChange);
  };
}

function setSidebarCollapsedSnapshot(collapsed: boolean) {
  localStorage.setItem(sidebarCollapsedStorageKey, String(collapsed));
  window.dispatchEvent(new Event(sidebarCollapsedEvent));
}

export function VeloraLogo() {
  return (
    <Image
      aria-hidden="true"
      className="size-7 shrink-0 rounded-lg"
      src={veloraLogoSrc}
      alt=""
      width={32}
      height={32}
    />
  );
}

export function TokenIcon({ size = "size-6" }: { size?: string }) {
  return (
    <span className={`${size} relative isolate block shrink-0 overflow-hidden rounded-full bg-[#121826]`}>
      <span className="absolute left-1/2 top-1/2 block h-[22%] w-[66%] -translate-x-1/2 -translate-y-[150%] rounded-full bg-[#00d1ff]" />
      <span className="absolute left-1/2 top-1/2 block h-[22%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#14f195]" />
      <span className="absolute left-1/2 top-1/2 block h-[22%] w-[66%] -translate-x-1/2 translate-y-1/2 rounded-full bg-[#9945ff]" />
    </span>
  );
}

function ConnectedWalletButton() {
  const { walletLabel, walletPublicKey, connecting, connect, disconnect } = useVeloraChain();
  const hydrated = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const label = hydrated ? walletLabel : "Connect wallet";
  const walletAddress = walletPublicKey?.toBase58();

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [menuOpen]);

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative">
      <button
        aria-expanded={menuOpen}
        className="sf-search flex h-11 items-center gap-2 rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-sm text-[#fffeea]"
        onClick={(event) => {
          event.stopPropagation();
          if (!walletPublicKey) {
            void connect();
            return;
          }
          setMenuOpen((open) => !open);
        }}
        type="button"
      >
        <TokenIcon size="size-7" />
        <span className="hidden sm:inline">{connecting && hydrated ? "Connecting..." : label}</span>
        <ChevronDown className={`text-[#fffeea]/55 transition ${menuOpen ? "rotate-180" : ""}`} size={18} />
      </button>
      {menuOpen && walletAddress ? (
        <div
          className="absolute right-0 top-13 z-50 w-64 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#0b0d11] py-2 text-sm text-[#fffeea]/82 shadow-2xl shadow-black/50"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-[#fffeea]/10 px-4 pb-3 pt-2">
            <div className="text-xs text-[#fffeea]/45">Connected wallet</div>
            <div className="mt-1 truncate font-semibold text-white">{walletAddress}</div>
          </div>
          <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#13151a]" onClick={() => void copyAddress()} type="button">
            <Copy size={16} />
            {copied ? "Copied" : "Copy address"}
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#13151a]" type="button">
            <Settings size={16} />
            Settings
          </button>
          <button
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-red-300 hover:bg-[#13151a]"
            onClick={() => {
              setMenuOpen(false);
              void disconnect();
            }}
            type="button"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TutorialHelper() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const step = protocolTutorialSteps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === protocolTutorialSteps.length - 1;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setStepIndex((current) => Math.min(current + 1, protocolTutorialSteps.length - 1));
      if (event.key === "ArrowLeft") setStepIndex((current) => Math.max(current - 1, 0));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        aria-label="Open protocol tutorial"
        className="sf-tutorial-button flex size-10 items-center justify-center rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-[#fffeea]/70 transition hover:border-[#fffeea]/30 hover:bg-[#13151a] hover:text-[#fffeea]"
        onClick={() => setOpen(true)}
        title="Protocol tutorial"
        type="button"
      >
        <HelpCircle size={20} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/64 px-4 py-6" role="presentation">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <section
            aria-labelledby="protocol-tutorial-title"
            aria-modal="true"
            className="relative z-[1] flex max-h-[calc(100vh-48px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[6px] border border-[#fffeea]/16 bg-[#0b0d11] text-[#fffeea] shadow-2xl shadow-black/60"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-[#fffeea]/10 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#f2d467]">Protocol tutorial</p>
                <p className="mt-1 text-sm text-[#fffeea]/50">
                  Step {stepIndex + 1} of {protocolTutorialSteps.length}
                </p>
              </div>
              <button
                aria-label="Close tutorial"
                className="grid size-9 place-items-center rounded-lg text-[#fffeea]/60 transition hover:bg-[#13151a] hover:text-[#fffeea]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              <div className="flex gap-2">
                {protocolTutorialSteps.map((item, index) => (
                  <button
                    aria-label={`Go to ${item.title}`}
                    className={`h-1.5 flex-1 rounded-full transition ${index === stepIndex ? "bg-[#f2d467]" : "bg-[#fffeea]/12 hover:bg-[#fffeea]/24"}`}
                    key={item.title}
                    onClick={() => setStepIndex(index)}
                    type="button"
                  />
                ))}
              </div>
              <div className="rounded-[4px] border border-[#fffeea]/12 bg-[#06070a] p-5">
                <p className="text-sm font-medium text-[#f2d467]">{step.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold leading-8 text-white" id="protocol-tutorial-title">
                  {step.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#fffeea]/64">{step.description}</p>
                <ul className="mt-5 flex flex-col gap-3">
                  {step.points.map((point) => (
                    <li className="flex gap-3 text-sm leading-5 text-[#fffeea]/70" key={point}>
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#f2d467]/14 text-[#f2d467]">
                        <Check size={13} />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#fffeea]/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea]/18 bg-[#13151a] px-4 text-sm font-medium text-[#fffeea]/82 transition hover:border-[#fffeea]/35 hover:bg-[#191b22]"
                href={step.href}
                onClick={() => setOpen(false)}
              >
                <CirclePlay size={16} />
                {step.action}
              </Link>
              <div className="flex gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea]/18 bg-[#13151a] px-4 text-sm font-medium text-[#fffeea]/82 transition hover:border-[#fffeea]/35 hover:bg-[#191b22] disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isFirstStep}
                  onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                  type="button"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea] bg-[#fffeea] px-4 text-sm font-medium !text-[#06070a] transition hover:border-[#f2d467] hover:bg-[#f2d467] hover:!text-[#06070a]"
                  onClick={() => (isLastStep ? setOpen(false) : setStepIndex((current) => current + 1))}
                  type="button"
                >
                  {isLastStep ? "Done" : "Next"}
                  {isLastStep ? null : <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SidebarItem({ item, collapsed = false }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname();
  const active =
    item.match === "/app"
      ? pathname === "/app"
      : item.match
        ? pathname.startsWith(item.match)
        : pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`sf-nav-item group relative flex w-full items-center gap-3 rounded-lg bg-transparent text-sm font-medium text-[#fffeea]/58 outline-none transition-colors hover:bg-[#13151a] hover:text-[#fffeea] focus-visible:ring-1 focus-visible:ring-[#f2d467] ${collapsed ? "justify-center px-0" : ""}`}
      href={item.href}
      title={collapsed ? item.label : undefined}
    >
      {active ? <span className="absolute -left-5 top-1/2 h-6 w-2 -translate-y-1/2 rounded-r bg-[#f2d467]" /> : null}
      <Icon className={active ? "text-[#f2d467]" : "text-[#fffeea]/55"} size={20} />
      {collapsed ? null : <span className={active ? "text-[#fffeea]" : ""}>{item.label}</span>}
    </Link>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`hidden h-full border-r border-[#fffeea]/12 bg-[#06070a] transition-[width] duration-200 lg:block ${collapsed ? "w-20" : "w-[280px]"}`}>
      <div className="grid h-full grid-rows-[72px_1fr_auto] text-[#fffeea]/60">
        <div className={`sf-sidebar-header flex h-[72px] items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {collapsed ? (
            <button
              aria-label="Expand sidebar"
              className="flex size-9 items-center justify-center rounded-lg border border-[#fffeea]/20 text-[#fffeea] transition hover:bg-[#13151a]"
              onClick={onToggle}
              type="button"
            >
              <PanelLeft className="rotate-180" size={18} />
            </button>
          ) : (
            <>
              <Link className="flex items-center gap-3" href="/app">
                <VeloraLogo />
                <span className="text-base font-semibold text-[#fffeea]">Velora</span>
              </Link>
              <button
                aria-label="Collapse sidebar"
                className="flex size-8 items-center justify-center rounded-lg border border-[#fffeea]/20 text-[#fffeea] transition hover:bg-[#13151a]"
                onClick={onToggle}
                type="button"
              >
                <PanelLeft size={20} />
              </button>
            </>
          )}
        </div>
        <nav className="sf-sidebar-nav flex min-h-0 flex-col overflow-hidden">
          <div className="flex flex-col gap-1">
            {mainNav.map((item) => (
              <SidebarItem collapsed={collapsed} item={item} key={item.label} />
            ))}
          </div>
        </nav>
        <div />
      </div>
    </aside>
  );
}

function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/62"
        onClick={onClose}
        type="button"
      />
      <aside className="absolute right-0 top-0 flex h-full w-[min(86vw,340px)] flex-col border-l border-[#fffeea]/12 bg-[#06070a] p-5 text-[#fffeea] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between">
          <Link className="flex items-center gap-3" href="/app" onClick={onClose}>
            <VeloraLogo />
            <span className="text-base font-semibold">Velora</span>
          </Link>
          <button
            aria-label="Close navigation"
            className="grid size-10 place-items-center rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-[#fffeea]/70"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-2">
          {mainNav.map((item) => {
            const active =
              item.match === "/app"
                ? pathname === "/app"
                : item.match
                  ? pathname.startsWith(item.match)
                  : pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  active ? "bg-[#13151a] text-[#fffeea]" : "text-[#fffeea]/62 hover:bg-[#13151a] hover:text-[#fffeea]"
                }`}
                href={item.href}
                key={item.label}
                onClick={onClose}
              >
                <Icon className={active ? "text-[#f2d467]" : "text-[#fffeea]/55"} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

function AppHeader({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sf-header flex h-[72px] items-center justify-end gap-2.5 border-b border-[#fffeea]/12 bg-[#06070a] md:px-10 lg:col-start-2">
      <Link className="mr-auto flex items-center gap-2 lg:hidden" href="/app">
        <VeloraLogo />
        <span className="text-sm font-semibold text-[#fffeea]">Velora</span>
      </Link>
      <label className="sf-search mr-auto hidden h-10 w-full max-w-[312px] items-center gap-2 rounded-md border border-[#fffeea]/15 bg-[#0b0d11] text-sm text-[#fffeea]/45 shadow-sm lg:flex">
        <Search size={20} />
        <span>Search</span>
      </label>
      <TutorialHelper />
      <button className="sf-notification-button flex size-10 items-center justify-center rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-[#fffeea]/70" type="button">
        <Bell size={20} />
      </button>
      <ConnectedWalletButton />
      <button
        aria-label="Open navigation"
        className="flex size-10 items-center justify-center rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-[#fffeea]/70 lg:hidden"
        onClick={onOpenMobileNav}
        type="button"
      >
        <Menu size={24} />
      </button>
    </header>
  );
}

export function AppShell({ children, maxWidth = "max-w-[1120px]" }: { children: React.ReactNode; maxWidth?: string }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsedStore,
    readSidebarCollapsedSnapshot,
    readSidebarCollapsedServerSnapshot,
  );

  return (
    <main className="h-screen min-w-80 overflow-hidden bg-[#06070a] font-[var(--font-primary),ui-sans-serif,system-ui,sans-serif] text-[#fffeea]">
      <div className={`grid h-full grid-cols-1 grid-rows-[72px_minmax(0,1fr)] bg-[#06070a] ${sidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[280px_1fr]"}`}>
        <div className="relative row-start-1 -row-end-1 hidden lg:block">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsedSnapshot(!sidebarCollapsed)} />
        </div>
        <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <div className="min-h-0 overflow-y-auto lg:col-start-2">
          <div className={`sf-content mx-auto flex w-full ${maxWidth} flex-col px-5 py-8 md:px-8`}>{children}</div>
        </div>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </main>
  );
}

export function PrimaryButton({
  children,
  href,
  onClick,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea] bg-[#fffeea] px-4 py-2 text-sm font-medium !text-[#06070a] shadow-sm transition hover:border-[#f2d467] hover:bg-[#f2d467] hover:!text-[#06070a] disabled:cursor-not-allowed disabled:opacity-45";
  if (href) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <button className={className} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  href,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea]/18 bg-[#13151a] px-4 py-2 text-sm font-medium text-[#fffeea]/82 transition hover:border-[#fffeea]/35 hover:bg-[#191b22] disabled:cursor-not-allowed disabled:opacity-45";
  if (href) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <button className={className} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
  label?: string;
}) {
  const className = `flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${enabled ? "justify-end bg-[#f2d467]" : "justify-start bg-[#2a2b2f]"}`;
  const knob = <span className="size-4 rounded-full bg-white shadow-sm" />;

  if (onChange) {
    return (
      <button
        aria-label={label}
        aria-pressed={enabled}
        className={className}
        onClick={() => onChange(!enabled)}
        type="button"
      >
        {knob}
      </button>
    );
  }

  return <span className={className}>{knob}</span>;
}

export function FieldCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] ${className}`}>{children}</div>;
}

function HeroBanner() {
  return (
    <section className="flex flex-col items-center gap-2">
      <article className="sf-hero relative flex h-[194px] w-full max-w-full flex-col justify-between overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#0b0d11] text-[#fffeea] md:h-44">
        <div className="pointer-events-none absolute inset-px overflow-hidden rounded-[15px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_18%,rgba(242,212,103,0.52)_0%,rgba(255,254,234,0.16)_28%,rgba(6,7,10,0.04)_72%)]" />
          <div className="absolute -right-28 bottom-8 h-28 w-[580px] -rotate-[18deg] rounded-full bg-[#f2d467] opacity-30 blur-[64px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/82 to-transparent" />
        </div>
        <div className="relative z-[1] flex max-w-[35rem] flex-col gap-2">
          <h1 className="text-xl font-semibold leading-7 tracking-normal">Token distribution, ready to schedule</h1>
          <p className="max-w-[34rem] text-sm leading-5 text-[#fffeea]/58">
            Create SPL token vesting streams, lock allocations on devnet, and let recipients claim tokens as each schedule unlocks.
          </p>
        </div>
        <button className="sf-primary-button relative z-[1] h-9 w-fit rounded-[4px] border border-[#fffeea] bg-[#fffeea] text-sm font-medium !text-[#06070a] transition hover:border-[#f2d467] hover:bg-[#f2d467] hover:!text-[#06070a]" type="button">
          Learn More
        </button>
      </article>
      <div className="flex h-4 items-center justify-center gap-2" aria-hidden="true">
        <span className="h-2 w-[18px] rounded-full bg-[#f2d467]" />
        <span className="size-2 rounded-full bg-[#fffeea]/16" />
        <span className="size-2 rounded-full bg-[#fffeea]/16" />
      </div>
    </section>
  );
}

export function DashboardHome() {
  const { streams, loadingStreams, error, walletPublicKey, connect, refresh } = useVeloraChain();
  const creatorStreams = useMemo(
    () => streams.filter((stream) => walletPublicKey && stream.creator.equals(walletPublicKey)),
    [streams, walletPublicKey],
  );
  const recipientStreams = useMemo(
    () => streams.filter((stream) => walletPublicKey && stream.recipient.equals(walletPublicKey)),
    [streams, walletPublicKey],
  );

  return (
    <AppShell maxWidth="max-w-[1120px]">
      <div className="flex flex-col gap-[68px]">
        <HeroBanner />
        <DashboardOverview
          creatorStreams={creatorStreams}
          error={error}
          loadingStreams={loadingStreams}
          onConnect={connect}
          onRefresh={refresh}
          recipientStreams={recipientStreams}
          walletConnected={Boolean(walletPublicKey)}
        />
        <section className="flex w-full flex-col gap-5">
          <h2 className="text-2xl font-medium leading-8 text-white">Get started</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {getStartedActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link href={item.href} key={item.title}>
                  <FieldCard className="flex min-h-[198px] flex-col justify-between p-5 transition-colors hover:border-[#fffeea]/30 hover:bg-[#13151a]">
                    <span className="grid size-12 place-items-center rounded-full bg-[#13151a] text-[#f2d467]">
                      <Icon size={21} />
                    </span>
                    <span className="block">
                      <span className="block text-lg font-semibold text-[#fffeea]">{item.title}</span>
                      <span className="mt-2 block text-sm leading-5 text-[#fffeea]/58">{item.description}</span>
                    </span>
                    <span className="text-sm font-medium text-[#f2d467]">{item.action}</span>
                  </FieldCard>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="flex w-full flex-col gap-8">
          <h2 className="text-2xl font-medium leading-8 text-white">You can also try</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  className="sf-quick-action flex min-h-[76px] items-center gap-4 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] transition-colors hover:border-[#fffeea]/30 hover:bg-[#13151a]"
                  href={action.href}
                  key={action.label}
                >
                  <span className="sf-action-icon flex size-11 shrink-0 items-center justify-center rounded-full bg-[#13151a] text-[#f2d467]">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1 text-base font-medium leading-6 text-white">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function DashboardOverview({
  creatorStreams,
  recipientStreams,
  walletConnected,
  loadingStreams,
  error,
  onConnect,
  onRefresh,
}: {
  creatorStreams: StreamView[];
  recipientStreams: StreamView[];
  walletConnected: boolean;
  loadingStreams: boolean;
  error: string | null;
  onConnect: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const ongoingCount = creatorStreams.filter((stream) => streamStatusLabel(stream) === "Ongoing").length;
  const scheduledCount = creatorStreams.filter((stream) => streamStatusLabel(stream) === "Scheduled").length;
  const completedCount = creatorStreams.filter((stream) => streamStatusLabel(stream) === "Completed").length;
  const totalCreatedAmount = creatorStreams.reduce((total, stream) => total + stream.totalAmount, BigInt(0));
  const totalClaimedAmount = creatorStreams.reduce((total, stream) => total + stream.amountClaimed, BigInt(0));
  const totalClaimableAmount = recipientStreams.reduce((total, stream) => total + stream.claimableAmount, BigInt(0));
  const readyToClaimCount = recipientStreams.filter((stream) => stream.claimableAmount > BigInt(0)).length;
  const recentCreatorStreams = creatorStreams.slice(0, 4);
  const dashboardStreams = [...creatorStreams, ...recipientStreams]
    .filter((stream, index, items) => items.findIndex((item) => item.publicKey.equals(stream.publicKey)) === index)
    .slice(0, 6);

  return (
    <section className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-medium leading-8 text-white">Dashboard</h2>
          <p className="mt-2 max-w-[560px] text-sm leading-5 text-[#fffeea]/58">
            Track vesting streams you created and claims connected to this wallet.
          </p>
        </div>
        {walletConnected ? (
          <SecondaryButton onClick={() => void onRefresh()}>
            <Search size={18} />
            Refresh
          </SecondaryButton>
        ) : null}
      </div>

      {error ? <FieldCard className="p-4 text-sm text-red-300">{error}</FieldCard> : null}

      {!walletConnected ? (
        <FieldCard className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-semibold text-white">Connect wallet to load dashboard</div>
            <p className="mt-2 max-w-[520px] text-sm leading-5 text-[#fffeea]/58">
              The dashboard uses your connected devnet wallet to separate created vesting streams from recipient claims.
            </p>
          </div>
          <PrimaryButton onClick={() => void onConnect()}>Connect wallet</PrimaryButton>
        </FieldCard>
      ) : loadingStreams ? (
        <FieldCard className="p-6 text-sm text-[#fffeea]/62">Loading dashboard streams...</FieldCard>
      ) : (
        <>
          <DashboardAnalytics creatorStreams={creatorStreams} recipientStreams={recipientStreams} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardMetric icon={Timer} label="Created streams" value={String(creatorStreams.length)} />
              <DashboardMetric icon={ArrowUp} label="Total scheduled" value={formatTokenAmount(totalCreatedAmount)} />
              <DashboardMetric icon={Check} label="Claimed from created" value={formatTokenAmount(totalClaimedAmount)} />
              <DashboardMetric icon={PackageOpen} label="Ready to claim" value={formatTokenAmount(totalClaimableAmount)} />
            </div>

            <FieldCard className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">All connected streams</h3>
                  <p className="mt-1 text-sm text-[#fffeea]/55">Streams where this wallet is creator or recipient.</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-[#fffeea]/12">
                {dashboardStreams.length > 0 ? (
                  dashboardStreams.map((stream) => <DashboardStreamRow key={stream.publicKey.toBase58()} stream={stream} />)
                ) : (
                  <div className="py-8 text-sm text-[#fffeea]/58">No streams found for this wallet.</div>
                )}
              </div>
            </FieldCard>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.95fr]">
            <FieldCard className="min-h-[316px] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Created vesting</h3>
                  <p className="mt-1 text-sm text-[#fffeea]/55">Recent streams created by this wallet.</p>
                </div>
                <Link className="text-sm font-medium text-[#f2d467]" href="/vesting">
                  View all
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[#fffeea]/45">Ongoing</div>
                  <div className="mt-1 text-lg font-semibold text-white">{ongoingCount}</div>
                </div>
                <div>
                  <div className="text-[#fffeea]/45">Scheduled</div>
                  <div className="mt-1 text-lg font-semibold text-white">{scheduledCount}</div>
                </div>
                <div>
                  <div className="text-[#fffeea]/45">Completed</div>
                  <div className="mt-1 text-lg font-semibold text-white">{completedCount}</div>
                </div>
              </div>

              <div className="mt-5 divide-y divide-[#fffeea]/12">
                {recentCreatorStreams.length > 0 ? (
                  recentCreatorStreams.map((stream) => (
                    <DashboardStreamRow key={stream.publicKey.toBase58()} stream={stream} />
                  ))
                ) : (
                  <div className="flex min-h-[132px] flex-col justify-center gap-4 text-sm text-[#fffeea]/58">
                    <span>No created vesting streams yet.</span>
                    <PrimaryButton href="/create-vesting/type">
                      <Plus size={18} />
                      Create new
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </FieldCard>

            <FieldCard className="flex min-h-[316px] flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Claim overview</h3>
                  <p className="mt-1 text-sm text-[#fffeea]/55">Recipient-side streams for this wallet.</p>
                </div>
                <Link className="text-sm font-medium text-[#f2d467]" href="/claim">
                  Open claim
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 divide-x divide-[#fffeea]/12 border-y border-[#fffeea]/12 py-4">
                <div className="pr-4">
                  <div className="text-sm text-[#fffeea]/45">Recipient streams</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{recipientStreams.length}</div>
                </div>
                <div className="pl-4">
                  <div className="text-sm text-[#fffeea]/45">Can claim now</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{readyToClaimCount}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-1 flex-col justify-between gap-6">
                <div>
                  <div className="text-sm text-[#fffeea]/45">Claimable tokens</div>
                  <div className="mt-2 flex items-center gap-3 text-2xl font-semibold text-white">
                    <TokenIcon />
                    {formatTokenAmount(totalClaimableAmount)}
                  </div>
                </div>
                <SecondaryButton href="/claim">
                  <PackageOpen size={18} />
                  Review claims
                </SecondaryButton>
              </div>
            </FieldCard>
          </div>
        </>
      )}
    </section>
  );
}

function DashboardAnalytics({
  creatorStreams,
  recipientStreams,
}: {
  creatorStreams: StreamView[];
  recipientStreams: StreamView[];
}) {
  const [view, setView] = useState<"created" | "receiving">("created");
  const activeStreams = view === "created" ? creatorStreams : recipientStreams;
  const statusData = ["Ongoing", "Scheduled", "Completed", "Canceled"].map((status) => {
    const key = status.toLowerCase() as keyof typeof analyticsChartConfig;
    return {
      key,
      name: status,
      value: activeStreams.filter((stream) => streamStatusLabel(stream) === status).length,
      fill: analyticsChartConfig[key].color,
    };
  });
  const totalAmount = activeStreams.reduce((total, stream) => total + stream.totalAmount, BigInt(0));
  const claimedAmount = activeStreams.reduce((total, stream) => total + stream.amountClaimed, BigInt(0));
  const claimableAmount = activeStreams.reduce((total, stream) => total + stream.claimableAmount, BigInt(0));
  const lockedAmount = totalAmount > claimedAmount ? totalAmount - claimedAmount : BigInt(0);
  const allocationData = [
    { name: "Claimed", claimed: chartAmount(claimedAmount), valueLabel: formatTokenAmount(claimedAmount) },
    { name: "Claimable", claimable: chartAmount(claimableAmount), valueLabel: formatTokenAmount(claimableAmount) },
    { name: "Locked", locked: chartAmount(lockedAmount), valueLabel: formatTokenAmount(lockedAmount) },
  ];
  const timelineData = [...activeStreams]
    .sort((a, b) => a.startTimestamp - b.startTimestamp)
    .slice(0, 7)
    .map((stream) => ({
      name: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(stream.startTimestamp * 1000)),
      total: chartAmount(stream.totalAmount),
      valueLabel: formatTokenAmount(stream.totalAmount),
    }));

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Analytics</h3>
          <p className="mt-1 max-w-[560px] text-sm leading-5 text-[#fffeea]/55">
            Visual breakdown of vesting status, token movement, and schedule timing.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-1 text-sm md:w-[260px]">
          {[
            { label: "Created", value: "created" },
            { label: "Receiving", value: "receiving" },
          ].map((item) => (
            <button
              className={`h-8 rounded-[3px] transition ${view === item.value ? "bg-[#fffeea] text-[#06070a]" : "text-[#fffeea]/58 hover:text-white"}`}
              key={item.value}
              onClick={() => setView(item.value as "created" | "receiving")}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <FieldCard className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-white">Status mix</div>
              <p className="mt-1 text-sm text-[#fffeea]/50">{activeStreams.length} streams in this view.</p>
            </div>
            <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">
              {view === "created" ? "Creator" : "Recipient"}
            </span>
          </div>
          {activeStreams.length > 0 ? (
            <ChartContainer className="mt-4 h-[246px]" config={analyticsChartConfig}>
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      config={analyticsChartConfig}
                      hideLabel
                      valueFormatter={chartValueLabel}
                    />
                  }
                />
                <Pie
                  cx="50%"
                  cy="50%"
                  data={statusData}
                  dataKey="value"
                  innerRadius={54}
                  nameKey="key"
                  outerRadius={86}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {statusData.map((entry) => (
                    <Cell fill={entry.fill} key={entry.key} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <AnalyticsEmptyState />
          )}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#fffeea]/58">
            {statusData.map((item) => (
              <div className="flex items-center justify-between gap-2" key={item.key}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  {item.name}
                </span>
                <span className="font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </FieldCard>

        <FieldCard className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-white">Token movement</div>
              <p className="mt-1 text-sm text-[#fffeea]/50">Claimed, currently claimable, and still locked.</p>
            </div>
          </div>
          {activeStreams.length > 0 ? (
            <ChartContainer className="mt-4 h-[246px]" config={analyticsChartConfig}>
              <BarChart accessibilityLayer data={allocationData}>
                <CartesianGrid stroke="rgba(255,254,234,0.08)" vertical={false} />
                <XAxis axisLine={false} dataKey="name" tickLine={false} tickMargin={10} />
                <YAxis axisLine={false} tickFormatter={(value) => Number(value).toLocaleString("en-US")} tickLine={false} width={72} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      config={analyticsChartConfig}
                      valueFormatter={(_, item) => String(item.payload?.valueLabel ?? "0")}
                    />
                  }
                />
                <Bar dataKey="claimed" fill="var(--color-claimed)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="claimable" fill="var(--color-claimable)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="locked" fill="var(--color-locked)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <AnalyticsEmptyState />
          )}
        </FieldCard>
      </div>

      <FieldCard className="p-5">
        <div className="flex flex-col gap-1">
          <div className="text-base font-semibold text-white">Schedule timeline</div>
          <p className="text-sm text-[#fffeea]/50">Earliest stream start dates in the selected view.</p>
        </div>
        {timelineData.length > 0 ? (
          <ChartContainer className="mt-4 h-[230px]" config={analyticsChartConfig}>
            <AreaChart accessibilityLayer data={timelineData}>
              <CartesianGrid stroke="rgba(255,254,234,0.08)" vertical={false} />
              <XAxis axisLine={false} dataKey="name" tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} tickFormatter={(value) => Number(value).toLocaleString("en-US")} tickLine={false} width={72} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    config={analyticsChartConfig}
                    valueFormatter={(_, item) => String(item.payload?.valueLabel ?? "0")}
                  />
                }
              />
              <Area
                dataKey="total"
                fill="rgba(242,212,103,0.18)"
                fillOpacity={1}
                name="total"
                stroke="var(--color-total)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <AnalyticsEmptyState />
        )}
      </FieldCard>
    </section>
  );
}

function AnalyticsEmptyState() {
  return (
    <div className="grid min-h-[230px] place-items-center text-center text-sm text-[#fffeea]/50">
      No stream data for this view yet.
    </div>
  );
}

function DashboardMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <FieldCard className="flex min-h-[126px] flex-col justify-between p-5">
      <span className="grid size-10 place-items-center rounded-full bg-[#13151a] text-[#f2d467]">
        <Icon size={19} />
      </span>
      <span className="block">
        <span className="block text-sm text-[#fffeea]/50">{label}</span>
        <span className="mt-1 block truncate text-2xl font-semibold text-white">{value}</span>
      </span>
    </FieldCard>
  );
}

function DashboardStreamRow({ stream }: { stream: StreamView }) {
  const metadata = useVestingMetadata();

  return (
    <Link
      className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-[#13151a]"
      href={`/contract/solana/devnet/${stream.publicKey.toBase58()}`}
    >
        <span className="flex min-w-0 items-center gap-3">
          <TokenIcon />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{streamTitle(stream, metadata)}</span>
            <span className="mt-1 block text-xs text-[#fffeea]/50">
              {stream.recipient.toBase58().slice(0, 5)}...{stream.recipient.toBase58().slice(-5)} · {formatDate(stream.startTimestamp)}
            </span>
            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#fffeea]/48">
              <span>Total {formatTokenAmount(stream.totalAmount)}</span>
              <span>Unlocked {formatTokenAmount(stream.unlockedAmount)}</span>
              <span>Claimed {formatTokenAmount(stream.amountClaimed)}</span>
              <span>{timeRemainingLabel(stream)}</span>
            </span>
          </span>
        </span>
      <span className="shrink-0 rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{streamStatusLabel(stream)}</span>
    </Link>
  );
}

export function VestingPage() {
  const { streams, loadingStreams, error, walletPublicKey, connect, refresh } = useVeloraChain();
  const [activeTab, setActiveTab] = useState("All");
  const creatorStreams = useMemo(
    () => streams.filter((stream) => walletPublicKey && stream.creator.equals(walletPublicKey)),
    [streams, walletPublicKey],
  );
  const filteredStreams = useMemo(
    () => creatorStreams.filter((stream) => matchesTab(stream, activeTab)),
    [activeTab, creatorStreams],
  );

  return (
    <AppShell>
      <section className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white">Vesting</h1>
            <p className="mt-3 text-base text-[#fffeea]/62">Distribute tokens over time with linear or time-based schedules.</p>
            <p className="mt-1 text-base text-[#fffeea]/62">
              {/* Need help getting started? <span className="text-[#f2d467]">Watch tutorial.</span> */}
            </p>
          </div>
          <PrimaryButton href="/create-vesting/type">
            <Plus size={18} />
            Create new
          </PrimaryButton>
        </div>
        <div className="flex gap-5 overflow-x-auto border-b border-[#fffeea]/14 text-sm md:gap-8">
          {["All", "Ongoing", "Scheduled", "Completed", "Canceled"].map((tab) => (
            <button
              className={`shrink-0 pb-4 ${tab === activeTab ? "border-b-2 border-[#f2d467] text-[#fffeea]" : "text-[#fffeea]/55"}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SecondaryButton>
              <ListFilter size={18} />
              Sorted by <span className="font-semibold text-white">default</span>
            </SecondaryButton>
            <SecondaryButton>
              <Filter size={18} />
              Filters
            </SecondaryButton>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SecondaryButton onClick={() => void refresh()}>
              <Search size={18} />
              Refresh
            </SecondaryButton>
            <label className="flex h-11 w-full items-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 text-[#fffeea]/45 sm:max-w-[320px]">
              <Search size={20} />
              <span>Search</span>
            </label>
          </div>
        </div>
        {error ? <FieldCard className="p-4 text-sm text-red-300">{error}</FieldCard> : null}
        {!walletPublicKey ? (
          <ConnectState title="Connect wallet" text="Connect Phantom on devnet to load your vesting streams." action={connect} />
        ) : loadingStreams ? (
          <FieldCard className="p-6 text-sm text-[#fffeea]/62">Loading devnet streams...</FieldCard>
        ) : filteredStreams.length > 0 ? (
          <VestingTable streams={filteredStreams} />
        ) : (
          <VestingEmptyState />
        )}
      </section>
    </AppShell>
  );
}

function ConnectState({ title, text, action }: { title: string; text: string; action: () => Promise<void> }) {
  return (
    <div className="grid min-h-[360px] place-items-center text-center">
      <div className="flex flex-col items-center">
        <div className="grid size-14 place-items-center rounded-[4px] bg-[#13151a] text-[#f2d467]">
          <Lock size={28} />
        </div>
        <h2 className="mt-6 text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-[420px] text-[#fffeea]/58">{text}</p>
        <div className="mt-8">
          <PrimaryButton onClick={() => void action()}>Connect wallet</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function VestingEmptyState() {
  return (
    <div className="grid min-h-[360px] place-items-center text-center">
      <div className="flex flex-col items-center">
        <div className="grid size-14 place-items-center rounded-[4px] bg-[#13151a] text-[#f2d467]">
          <Hourglass size={30} />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Nothing here yet</h2>
        <p className="mt-2 text-[#fffeea]/58">Create a new vesting contract to get started.</p>
        <div className="mt-10 flex gap-4">
          <SecondaryButton>
            <CirclePlay size={18} />
            Watch tutorial
          </SecondaryButton>
          <PrimaryButton href="/create-vesting/type">
            <Plus size={18} />
            Create new
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function VestingTable({ streams }: { streams: StreamView[] }) {
  const metadata = useVestingMetadata();
  const [openMenuStream, setOpenMenuStream] = useState<string | null>(null);
  const columns = ["Amount", "Contract", "Type", "Transaction", "Recipient", "Status", "Start date"];
  return (
    <>
      <div className="grid gap-4 md:hidden">
        {streams.map((stream) => {
          const streamAddress = stream.publicKey.toBase58();
          const recipientAddress = stream.recipient.toBase58();

          return (
            <FieldCard className="p-4" key={streamAddress}>
              <div className="flex items-start justify-between gap-3">
                <Link className="flex min-w-0 items-start gap-3" href={`/contract/solana/devnet/${streamAddress}`}>
                  <TokenIcon />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-white">{streamTitle(stream, metadata)}</span>
                    <span className="mt-1 block text-xs text-[#fffeea]/50">
                      {streamAddress.slice(0, 5)}...{streamAddress.slice(-5)}
                    </span>
                  </span>
                </Link>
                <div className="relative shrink-0">
                  <button
                    aria-expanded={openMenuStream === streamAddress}
                    aria-label="Open contract actions"
                    className="grid size-9 place-items-center rounded-[4px] text-[#fffeea]/62 transition hover:bg-[#13151a] hover:text-[#fffeea]"
                    onClick={() => setOpenMenuStream((current) => (current === streamAddress ? null : streamAddress))}
                    type="button"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {openMenuStream === streamAddress ? (
                    <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#13151a] py-1 text-sm text-[#fffeea]/82 shadow-2xl shadow-black/50">
                      <Link className="block px-4 py-2.5 hover:bg-[#191b22]" href={`/contract/solana/devnet/${streamAddress}`}>
                        View details
                      </Link>
                      <button className="block w-full px-4 py-2.5 text-left hover:bg-[#191b22]" type="button">
                        Copy contract address
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{streamStatusLabel(stream)}</span>
                <span className="rounded-[4px] border border-[#fffeea]/12 px-3 py-1 text-xs text-[#fffeea]/55">{scheduleLabel(stream.scheduleType)}</span>
                <span className="text-xs text-[#fffeea]/45">{timeRemainingLabel(stream)}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-[#fffeea]/42">Amount</div>
                  <div className="mt-1 font-semibold text-white">{formatTokenAmount(stream.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#fffeea]/42">Unlocked</div>
                  <div className="mt-1 font-semibold text-white">{formatTokenAmount(stream.unlockedAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#fffeea]/42">Claimed</div>
                  <div className="mt-1 font-semibold text-white">{formatTokenAmount(stream.amountClaimed)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#fffeea]/42">Start date</div>
                  <div className="mt-1 font-semibold text-white">{formatDate(stream.startTimestamp)}</div>
                </div>
              </div>

              <div className="mt-4 border-t border-[#fffeea]/10 pt-4 text-xs text-[#fffeea]/50">
                Recipient {recipientAddress.slice(0, 5)}...{recipientAddress.slice(-5)}
              </div>
            </FieldCard>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="text-[#fffeea]/50">
          <tr>
            {columns.map((column) => (
              <th className="px-3 py-4 font-medium" key={column}>
                {column}
              </th>
            ))}
            <th className="px-3 py-4" />
          </tr>
        </thead>
          <tbody>
            {streams.map((stream) => (
              <tr className="cursor-pointer border-t border-[#fffeea]/12 transition hover:bg-[#13151a]" key={stream.publicKey.toBase58()} onClick={() => (window.location.href = `/contract/solana/devnet/${stream.publicKey.toBase58()}`)}>
              <td className="px-3 py-5">
                <div className="flex items-center gap-3">
                  <TokenIcon />
                  <div>
                    <div className="font-semibold text-white">{formatTokenAmount(stream.totalAmount)}</div>
                    <div className="mt-1 text-xs text-[#fffeea]/50">
                      Unlocked {formatTokenAmount(stream.unlockedAmount)} · Claimed {formatTokenAmount(stream.amountClaimed)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-5">
                <div className="max-w-[180px] truncate font-semibold text-white">{streamTitle(stream, metadata)}</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-[#fffeea]/58">{stream.publicKey.toBase58().slice(0, 5)}...{stream.publicKey.toBase58().slice(-5)} <Copy size={14} /></div>
              </td>
              <td className="px-3 py-5 font-medium text-white">{scheduleLabel(stream.scheduleType)}</td>
              <td className="px-3 py-5 font-medium text-white">Outgoing</td>
              <td className="px-3 py-5 font-medium text-white">{stream.recipient.toBase58().slice(0, 5)}...{stream.recipient.toBase58().slice(-5)}</td>
              <td className="px-3 py-5">
                <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{streamStatusLabel(stream)}</span>
                <div className="mt-2 text-xs text-[#fffeea]/50">{timeRemainingLabel(stream)}</div>
              </td>
              <td className="px-3 py-5 font-medium text-white">{formatDate(stream.startTimestamp)}</td>
              <td className="relative px-3 py-5 text-[#fffeea]/62">
                <button
                  aria-expanded={openMenuStream === stream.publicKey.toBase58()}
                  aria-label="Open contract actions"
                  className="grid size-8 place-items-center rounded-[4px] text-[#fffeea]/62 transition hover:bg-[#13151a] hover:text-[#fffeea]"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuStream((current) => (current === stream.publicKey.toBase58() ? null : stream.publicKey.toBase58()));
                  }}
                  type="button"
                >
                  <MoreHorizontal size={20} />
                </button>
                {openMenuStream === stream.publicKey.toBase58() ? (
                  <div
                    className="absolute right-3 top-12 z-50 w-48 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#13151a] py-1 text-sm text-[#fffeea]/82 shadow-2xl shadow-black/50"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Link className="block px-4 py-2.5 hover:bg-[#191b22]" href={`/contract/solana/devnet/${stream.publicKey.toBase58()}`}>
                      View details
                    </Link>
                    <button className="block w-full px-4 py-2.5 text-left hover:bg-[#191b22]" type="button">
                      Copy contract address
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

export function ClaimPage() {
  const tabs = ["Vesting"];
  const { streams, walletPublicKey, loadingStreams, error, connect, withdraw } = useVeloraChain();
  const [busyStream, setBusyStream] = useState<string | null>(null);
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const claimableStreams = useMemo(
    () => streams.filter((stream) => walletPublicKey && stream.recipient.equals(walletPublicKey)),
    [streams, walletPublicKey],
  );

  return (
    <AppShell maxWidth="max-w-[1120px]">
      <section className="flex w-full flex-col gap-6">
        <div className="max-w-[520px]">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">Claim</h1>
          <p className="mt-2 text-base leading-6 text-[#fffeea]/62">
            Claim vesting contracts where you are the recipient.
          </p>
        </div>

        <div className="flex gap-6 border-b border-[#fffeea]/14 text-sm">
          {tabs.map((tab) => (
            <button
              className={`pb-4 ${tab === "Vesting" ? "border-b-2 border-[#f2d467] font-semibold text-[#fffeea]" : "text-[#fffeea]/55"}`}
              key={tab}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SecondaryButton>
              <ListFilter size={18} />
              Sorted by <span className="font-semibold text-white">default</span>
            </SecondaryButton>
            <SecondaryButton>
              <Filter size={18} />
              Filters
            </SecondaryButton>
          </div>
          <label className="flex h-10 w-full items-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 text-[#fffeea]/45 md:max-w-[280px]">
            <Search size={20} />
            <span>Search</span>
          </label>
        </div>

        {error ? <FieldCard className="p-4 text-sm text-red-300">{error}</FieldCard> : null}
        {actionError ? <FieldCard className="p-4 text-sm text-red-300">{actionError}</FieldCard> : null}
        {transactionStage !== "idle" ? (
          <FieldCard className={`p-4 text-sm ${transactionStage === "error" ? "text-red-300" : "text-[#fffeea]/70"}`}>
            {transactionStageLabel(transactionStage)}
          </FieldCard>
        ) : null}
        {!walletPublicKey ? (
          <ConnectState title="Connect wallet" text="Connect the recipient wallet to see claimable vesting contracts." action={connect} />
        ) : loadingStreams ? (
          <FieldCard className="p-6 text-sm text-[#fffeea]/62">Loading claimable streams...</FieldCard>
        ) : (
          <ClaimTable
            busyStream={busyStream}
            onWithdraw={async (stream) => {
              setBusyStream(stream.publicKey.toBase58());
              setTransactionStage("wallet_approval");
              setActionError(null);
              try {
                await delay(150);
                setTransactionStage("sending");
                await withdraw(stream);
                setTransactionStage("confirming");
                await delay(150);
                setTransactionStage("success");
                await delay(900);
                setTransactionStage("idle");
              } catch (withdrawError) {
                setTransactionStage("error");
                setActionError(withdrawError instanceof Error ? withdrawError.message : "Could not claim available tokens.");
              } finally {
                setBusyStream(null);
              }
            }}
            streams={claimableStreams}
          />
        )}
      </section>
    </AppShell>
  );
}

function ClaimTable({
  streams,
  onWithdraw,
  busyStream,
}: {
  streams: StreamView[];
  onWithdraw: (stream: StreamView) => Promise<void>;
  busyStream: string | null;
}) {
  if (streams.length === 0) {
    return <FieldCard className="p-6 text-sm text-[#fffeea]/62">No recipient streams found for the connected wallet.</FieldCard>;
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {streams.map((stream) => (
          <ClaimMobileCard
            busyStream={busyStream}
            key={stream.publicKey.toBase58()}
            onWithdraw={onWithdraw}
            stream={stream}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="text-[#fffeea]/50">
          <tr>
            <th className="px-3 py-2 font-medium">
              <span className="inline-flex items-center gap-1">
                Amount <ChevronDown className="rotate-180 text-[#fffeea]/45" size={16} />
              </span>
            </th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Recipient</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">
              <span className="inline-flex items-center gap-1">
                Start date <ChevronDown className="rotate-180 text-[#fffeea]/45" size={16} />
              </span>
            </th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) => (
            <ClaimTableRow
              busyStream={busyStream}
              key={stream.publicKey.toBase58()}
              onWithdraw={onWithdraw}
              stream={stream}
            />
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function ClaimMobileCard({
  stream,
  onWithdraw,
  busyStream,
}: {
  stream: StreamView;
  onWithdraw: (stream: StreamView) => Promise<void>;
  busyStream: string | null;
}) {
  const isBusy = busyStream === stream.publicKey.toBase58();
  const canClaim = stream.status === "Active" && stream.claimableAmount > BigInt(0);
  const claimLabel = claimActionLabel(stream, isBusy);
  const recipientAddress = stream.recipient.toBase58();

  return (
    <FieldCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <TokenIcon />
          <div className="min-w-0">
            <div className="text-xs text-[#fffeea]/45">Claimable amount</div>
            <div className="mt-1 text-lg font-semibold text-white">{formatTokenAmount(stream.claimableAmount)}</div>
            <div className="mt-1 text-xs leading-5 text-[#fffeea]/50">
              of {formatTokenAmount(stream.totalAmount)} total
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{streamStatusLabel(stream)}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-[#fffeea]/42">Type</div>
          <div className="mt-1 font-semibold text-white">{scheduleLabel(stream.scheduleType)}</div>
        </div>
        <div>
          <div className="text-xs text-[#fffeea]/42">Unlocked</div>
          <div className="mt-1 font-semibold text-white">{formatTokenAmount(stream.unlockedAmount)}</div>
        </div>
        <div>
          <div className="text-xs text-[#fffeea]/42">Start date</div>
          <div className="mt-1 font-semibold text-white">{formatDate(stream.startTimestamp)}</div>
        </div>
        <div>
          <div className="text-xs text-[#fffeea]/42">Time</div>
          <div className="mt-1 font-semibold text-white">{timeRemainingLabel(stream)}</div>
        </div>
      </div>

      <div className="mt-4 border-t border-[#fffeea]/10 pt-4 text-xs text-[#fffeea]/50">
        Recipient {recipientAddress.slice(0, 5)}...{recipientAddress.slice(-5)}
      </div>

      <div className="mt-4">
        <PrimaryButton disabled={!canClaim || isBusy} onClick={() => void onWithdraw(stream)}>
          {claimLabel}
        </PrimaryButton>
      </div>
    </FieldCard>
  );
}

function ClaimTableRow({
  stream,
  onWithdraw,
  busyStream,
}: {
  stream: StreamView;
  onWithdraw: (stream: StreamView) => Promise<void>;
  busyStream: string | null;
}) {
  const isBusy = busyStream === stream.publicKey.toBase58();
  const canClaim = stream.status === "Active" && stream.claimableAmount > BigInt(0);
  const claimLabel = claimActionLabel(stream, isBusy);

  return (
    <tr className="transition hover:bg-[#13151a]">
        <td className="px-3 py-5">
          <div className="flex items-center gap-3">
            <TokenIcon />
          <div>
            <div className="font-semibold text-white">{formatTokenAmount(stream.claimableAmount)}</div>
            <div className="mt-1 text-xs text-[#fffeea]/50">
              of {formatTokenAmount(stream.totalAmount)} · Unlocked {formatTokenAmount(stream.unlockedAmount)}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-5 font-medium text-white">{scheduleLabel(stream.scheduleType)}</td>
      <td className="px-3 py-5">
        <span className="inline-flex items-center gap-1 font-semibold text-white">
          {stream.recipient.toBase58().slice(0, 5)}...{stream.recipient.toBase58().slice(-5)}
          <Copy className="text-[#fffeea]/55" size={14} />
        </span>
      </td>
      <td className="px-3 py-5">
        <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{streamStatusLabel(stream)}</span>
        <div className="mt-2 text-xs text-[#fffeea]/50">{timeRemainingLabel(stream)}</div>
      </td>
      <td className="px-3 py-5">
        <span className="inline-flex items-center gap-1 font-semibold text-white">
          {formatDate(stream.startTimestamp)}
          <Info className="text-[#fffeea]/50" size={16} />
        </span>
      </td>
      <td className="px-3 py-5 text-[#fffeea]/62">
        <PrimaryButton disabled={!canClaim || isBusy} onClick={() => void onWithdraw(stream)}>
          {claimLabel}
        </PrimaryButton>
      </td>
    </tr>
  );
}

function WizardChrome({ children, step, footer }: { children: React.ReactNode; step: string; footer: React.ReactNode }) {
  const steps = ["Type", "Configuration", "Recipients", "Review"];
  const activeIndex = steps.indexOf(step);
  return (
    <main className="flex min-h-screen flex-col bg-[#06070a] font-[var(--font-primary),ui-sans-serif,system-ui,sans-serif] text-[#fffeea]">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#fffeea]/12 px-4 text-[#fffeea]/58 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-sm md:gap-3">
          <Home size={18} />
          {steps.slice(0, activeIndex + 1).map((item) => (
            <span className="flex shrink-0 items-center gap-2 md:gap-3" key={item}>
              <ChevronRight size={16} />
              <span className={item === step ? "font-semibold text-white" : ""}>{item}</span>
            </span>
          ))}
        </div>
        <Link className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-[#fffeea]/12 bg-[#0b0d11]" href="/vesting" aria-label="Close create flow">
          <X size={20} />
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
      <footer className="sticky bottom-0 z-20 border-t border-[#fffeea]/12 bg-[#06070a] px-4 py-4 md:px-8 md:py-5">
        <div className="mx-auto flex w-full max-w-[1132px] items-center justify-between gap-3">{footer}</div>
      </footer>
    </main>
  );
}

export function TypePage() {
  const { draft, setDraft } = useVestingDraft();
  const options: Array<{
    scheduleType: StreamView["scheduleType"];
    title: string;
    text: string;
    icon: React.ReactNode;
  }> = [
    {
      scheduleType: "Linear",
      title: "Linear",
      text: "Gradually releases tokens to recipients over a fixed vesting window.",
      icon: <CalendarDays className="text-[#f2d467]" size={44} />,
    },
    {
      scheduleType: "Cliff",
      title: "Cliff",
      text: "Locks tokens until the cliff date, then unlocks the full allocation at once.",
      icon: <Lock className="text-[#f2d467]" size={44} />,
    },
    {
      scheduleType: "CliffLinear",
      title: "Hybrid",
      text: "Unlocks part at the cliff, then vests the remaining tokens linearly.",
      icon: <Hourglass className="text-[#f2d467]" size={44} />,
    },
    {
      scheduleType: "Milestone",
      title: "Milestone",
      text: "Unlocks tokens after the creator releases the milestone on-chain.",
      icon: <Check className="text-[#f2d467]" size={44} />,
    },
  ];

  return (
    <WizardChrome
      step="Type"
      footer={
        <>
          <span />
          <PrimaryButton href="/create-vesting/configuration">Continue</PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[1060px] flex-col items-center px-4 py-10 md:min-h-[760px] md:justify-center md:px-0">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Choose type</h1>
        <p className="mt-3 text-center text-base text-[#fffeea]/62 md:mt-4 md:text-2xl">Choose the vesting type you would like to create.</p>
        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-4 lg:gap-6">
          {options.map((option) => {
            const selected = draft.scheduleType === option.scheduleType;
            return (
              <button
                aria-pressed={selected}
                className="group text-left"
                key={option.scheduleType}
                onClick={() =>
                  setDraft({
                    scheduleType: option.scheduleType,
                    cliffEnabled: hasCliffDate(option.scheduleType),
                    cliffDateTime: hasCliffDate(option.scheduleType) ? draft.cliffDateTime || defaultCliffDateTime(draft) : "",
                    startsImmediately: option.scheduleType === "Milestone" ? true : draft.startsImmediately,
                  })
                }
                type="button"
              >
                <FieldCard
                  className={`relative h-full p-5 transition md:p-8 ${
                    selected
                      ? "border-[#f2d467] bg-[#17150f] shadow-[0_0_0_1px_rgba(242,212,103,0.65),0_18px_60px_rgba(0,0,0,0.24)]"
                      : "hover:border-[#fffeea]/35 hover:bg-[#111318]"
                  }`}
                >
                  <span
                    className={`absolute right-4 top-4 grid size-7 place-items-center rounded-full border text-xs transition ${
                      selected ? "border-[#f2d467] bg-[#f2d467] text-[#06070a]" : "border-[#fffeea]/18 text-transparent group-hover:border-[#fffeea]/35"
                    }`}
                  >
                    <Check size={15} />
                  </span>
                  <span className={`block transition ${selected ? "scale-105" : ""}`}>{option.icon}</span>
                  <h2 className="mt-8 text-lg font-semibold md:mt-14">{option.title}</h2>
                  <p className="mt-3 text-base leading-6 text-[#fffeea]/62">{option.text}</p>
                  {selected ? <p className="mt-6 text-sm font-semibold text-[#f2d467]">Selected</p> : null}
                </FieldCard>
              </button>
            );
          })}
        </div>
      </section>
    </WizardChrome>
  );
}

function SelectBox({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className="relative">
      {label ? (
          <label className="text-sm font-semibold text-white">
            {label}
            {required ? <span className="text-[#f2d467]">*</span> : null}
          </label>
      ) : null}
      <button
        aria-expanded={open}
        className={`${label ? "mt-2" : ""} flex h-12 w-full items-center justify-between rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 text-left text-sm text-[#fffeea] transition hover:border-[#fffeea]/28 focus-visible:border-[#f2d467] focus-visible:outline-none`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`text-[#fffeea]/45 transition ${open ? "rotate-180" : ""}`} size={18} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#13151a] py-1 shadow-2xl shadow-black/40">
            {options.map((option) => (
              <button
                className={`block w-full px-4 py-2.5 text-left text-sm transition ${
                  option.disabled
                    ? "cursor-not-allowed text-[#fffeea]/32"
                    : `hover:bg-[#191b22] ${option.value === value ? "text-[#fffeea]" : "text-[#fffeea]/62"}`
                }`}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ConfigurationPage() {
  const hydrated = useHydrated();
  const { draft, setDraft } = useVestingDraft();
  const tokenBalance = useSelectedTokenBalance(draft.tokenMint);
  const [unlockSchedule, setUnlockSchedule] = useState("Monthly");
  const [recipientChange, setRecipientChange] = useState("Only Sender");
  const [autoClaim, setAutoClaim] = useState(true);
  const dateSummary = `${formatDraftDate(draft.startDateTime)} - ${formatDraftDate(draft.endDateTime)}`;
  const scheduleIssue = hydrated ? getScheduleIssue(draft) : null;
  const canContinue = hydrated && tokenBalance.status === "ready" && !scheduleIssue;
  const isMilestone = draft.scheduleType === "Milestone";
  const isCancelable = draft.cancelAuthority !== "Neither" && draft.cancellable;
  const permissionSummary = [
    isCancelable ? "Cancellable" : "Non-cancellable",
    isMilestone ? "Milestone release" : `${scheduleLabel(draft.scheduleType)} schedule`,
  ];

  return (
    <WizardChrome
      step="Configuration"
      footer={
        <>
          <SecondaryButton href="/create-vesting/type">Back</SecondaryButton>
          <PrimaryButton disabled={!canContinue} href={canContinue ? "/create-vesting/recipients" : undefined}>Continue</PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Configuration</h1>
          <p className="text-sm text-[#fffeea]/58">Set the token, release cadence, and contract permissions.</p>
        </div>
        {scheduleIssue ? <FieldCard className="p-4 text-sm text-amber-200">{scheduleIssue}</FieldCard> : null}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
          <div className="flex flex-col gap-6 md:gap-8">
            <section className="flex flex-col gap-5">
              <h2 className="text-sm font-semibold text-[#fffeea]/78">Vesting setup</h2>
              <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
                <div className="min-w-0">
                  <SelectBox
                    label="Token"
                    onChange={(value) =>
                      setDraft({
                        tokenPreset: value,
                        tokenMint: value === "velora-test" ? veloraDevnetMint : "",
                      })
                    }
                    options={tokenOptions}
                    value={draft.tokenPreset}
                    required
                  />
                  {draft.tokenPreset === "custom" ? (
                    <div className="mt-3">
                      <TextInput
                        label="Custom SPL mint address*"
                        onChange={(value) => setDraft({ tokenMint: value })}
                        placeholder="Paste SPL mint address"
                        value={draft.tokenMint}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 break-all text-xs text-[#fffeea]/42 md:truncate">{veloraDevnetMint}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-white">Wallet balance</label>
                  <div className="mt-2">
                    <BalanceNotice state={tokenBalance} />
                  </div>
                </div>
                  {isMilestone ? (
                    <div>
                      <label className="text-sm font-semibold text-white">Unlock schedule</label>
                      <FieldCard className="mt-2 flex h-12 items-center px-4 text-sm text-[#fffeea]/78">Manual milestone release</FieldCard>
                    </div>
                  ) : (
                    <SelectBox label="Unlock schedule" onChange={setUnlockSchedule} options={unlockScheduleOptions} value={unlockSchedule} required />
                  )}
                  <SelectBox label="Who can change the recipient?" onChange={setRecipientChange} options={recipientChangeOptions} value={recipientChange} />
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div>
                  <h2 className="text-sm font-semibold text-[#fffeea]/78">{isMilestone ? "Milestone release deadline" : "Vesting start date"}</h2>
                  <FieldCard className="mt-2 flex min-h-[168px] flex-col gap-4 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{isMilestone ? "Release before deadline" : draft.startsImmediately ? "Upon contract creation" : "Schedule manually"}</div>
                        <div className="mt-1 text-xs text-[#fffeea]/50">
                          {isMilestone
                            ? "The milestone must be released on-chain before the deadline expires."
                            : draft.startsImmediately
                              ? "The unlock period begins when the stream is created."
                              : "The stream waits until the selected start date."}
                        </div>
                      </div>
                      {isMilestone ? null : <Toggle enabled={draft.startsImmediately} label="Toggle immediate start" onChange={(enabled) => setDraft({ startsImmediately: enabled })} />}
                    </div>
                    {!isMilestone && !draft.startsImmediately ? (
                      <DateTimeInput label="Start date*" onChange={(value) => setDraft({ startDateTime: value })} value={draft.startDateTime} />
                    ) : null}
                    <DateTimeInput label={isMilestone ? "Release deadline*" : "End date*"} onChange={(value) => setDraft({ endDateTime: value })} value={draft.endDateTime} />
                  </FieldCard>
                </div>
                {isMilestone ? (
                <div>
                  <h2 className="text-sm font-semibold text-[#fffeea]/78">Milestone release</h2>
                  <FieldCard className="mt-2 flex min-h-[168px] flex-col justify-between gap-4 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">Manual creator release</div>
                        <div className="mt-1 text-xs leading-5 text-[#fffeea]/50">The creator releases this stream on-chain when the milestone is complete.</div>
                      </div>
                      <span className="shrink-0 rounded-[4px] border border-[#f2d467]/35 bg-[#f2d467]/12 px-3 py-1.5 text-xs font-semibold text-[#f2d467]">
                        Milestone
                      </span>
                    </div>
                    <label>
                      <span className="text-xs font-medium text-[#fffeea]/48">Milestone description</span>
                      <span className="mt-2 flex h-12 items-center rounded-[4px] border border-[#fffeea]/14 bg-[#06070a] px-4 focus-within:border-[#f2d467]">
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm text-[#fffeea] outline-none placeholder:text-[#fffeea]/40"
                          onChange={(event) => setDraft({ milestoneDescription: event.target.value })}
                          placeholder="e.g. TGE completed"
                          value={draft.milestoneDescription}
                        />
                      </span>
                    </label>
                  </FieldCard>
                </div>
                ) : (
                  <div>
                    <h2 className="text-sm font-semibold text-[#fffeea]/78">Cliff configuration</h2>
                    <FieldCard className="mt-2 flex min-h-[168px] flex-col justify-between gap-4 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold">{hasCliffDate(draft.scheduleType) ? `${scheduleLabel(draft.scheduleType)} cliff` : "No cliff"}</div>
                          <div className="mt-1 text-xs leading-5 text-[#fffeea]/50">
                            {draft.scheduleType === "Cliff"
                              ? "Tokens stay locked until the cliff date, then unlock all at once."
                              : draft.scheduleType === "CliffLinear"
                                ? "Tokens stay locked until the cliff date, then part unlocks before linear vesting continues."
                                : "Linear vesting starts immediately."}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-[4px] border border-[#fffeea]/14 bg-[#111318] px-3 py-1.5 text-xs font-semibold text-[#fffeea]/70">
                          {scheduleLabel(draft.scheduleType)}
                        </span>
                      </div>
                      {hasCliffDate(draft.scheduleType) ? (
                        <div className="grid gap-4">
                          <label className="block">
                            <span className="text-xs font-medium text-[#fffeea]/48">Cliff date</span>
                            <span className="mt-2 flex h-12 items-center rounded-[4px] border border-[#fffeea]/14 bg-[#06070a] px-4 focus-within:border-[#f2d467]">
                              <input
                                className="min-w-0 flex-1 bg-transparent text-sm text-[#fffeea] outline-none [color-scheme:dark]"
                                onChange={(event) => setDraft({ cliffDateTime: event.target.value })}
                                type="datetime-local"
                                value={draft.cliffDateTime}
                              />
                            </span>
                            <span className="mt-2 block text-xs leading-5 text-[#fffeea]/45">
                              Cliff must be after the start date and before the end date.
                            </span>
                          </label>
                          {draft.scheduleType === "CliffLinear" ? (
                            <TextInput
                              label="Cliff unlock amount"
                              onChange={(value) => setDraft({ cliffAmount: value })}
                              placeholder="0"
                              prefix={<TokenIcon size="size-6" />}
                              value={draft.cliffAmount}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-[4px] border border-dashed border-[#fffeea]/12 bg-[#06070a] px-4 py-3 text-xs text-[#fffeea]/45">
                          Linear streams do not use a cliff date.
                        </div>
                      )}
                    </FieldCard>
                  </div>
                )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[#fffeea]/78">Contract permissions</h2>
              <FieldCard className="p-4">
                <div className="flex items-center justify-between gap-4 border-b border-[#fffeea]/12 pb-4">
                  <div>
                    <div className="text-sm font-semibold">Auto-claim</div>
                    <div className="mt-1 text-xs text-[#fffeea]/50">Send tokens to recipient wallets automatically.</div>
                  </div>
                  <Toggle enabled={autoClaim} label="Toggle Auto-claim" onChange={setAutoClaim} />
                </div>
                <div className="grid gap-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] md:items-center">
                    <div>
                      <div className="text-sm font-semibold">Cancel authority</div>
                      <div className="mt-1 text-xs text-[#fffeea]/50">Choose who is allowed to stop the stream before completion.</div>
                    </div>
                    <SelectBox
                      onChange={(value) =>
                        setDraft({
                          cancelAuthority: value as VestingDraft["cancelAuthority"],
                          cancellable: value !== "Neither",
                        })
                      }
                      options={cancelAuthorityOptions}
                      value={draft.cancelAuthority}
                    />
                  </div>
                  {isMilestone ? (
                    <div className="grid gap-4 border-t border-[#fffeea]/12 pt-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] md:items-start">
                      <div>
                        <div className="text-sm font-semibold">Release authority</div>
                        <div className="mt-1 text-xs text-[#fffeea]/50">Choose who can manually release the milestone before the deadline.</div>
                      </div>
                      <div>
                        <SelectBox
                          onChange={(value) => {
                            if (value === "MultiSig") return;
                            setDraft({ authorityType: value as VestingDraft["authorityType"] });
                          }}
                          options={authorityTypeOptions}
                          value={draft.authorityType}
                        />
                        {draft.authorityType === "MultiSig" ? (
                          <p className="mt-2 text-xs text-[#fffeea]/45">MultiSig setup needs the later backend approval model.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {isMilestone && draft.authorityType === "SingleKey" ? (
                    <TextInput
                      label="Release authority wallet"
                      onChange={(value) => setDraft({ releaseAuthorityWallet: value })}
                      placeholder="Paste release authority public key"
                      suffix={<FileText size={20} />}
                      value={draft.releaseAuthorityWallet}
                    />
                  ) : null}
                </div>
              </FieldCard>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-[#fffeea]/78">Configuration summary</h2>
            <FieldCard className="p-4">
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-1">
                <SummaryItem label="Token">{tokenLabel(draft)}</SummaryItem>
                <SummaryItem label="Mint">{draft.tokenMint || "Not set"}</SummaryItem>
                <SummaryItem label="Wallet balance">
                  {tokenBalance.balance ? `${formatTokenAmount(tokenBalance.balance.amount)} tokens` : tokenBalance.message}
                </SummaryItem>
                  <SummaryItem label={isMilestone ? "Release deadline" : "Vesting window"}>
                    {isMilestone ? formatDraftDate(draft.endDateTime) : draft.startsImmediately ? `Upon creation - ${formatDraftDate(draft.endDateTime)}` : dateSummary}
                  </SummaryItem>
                  <SummaryItem label="Unlock schedule">{isMilestone ? "Manual release" : unlockSchedule}</SummaryItem>
                <SummaryItem label="Type">{scheduleLabel(draft.scheduleType)}</SummaryItem>
                  <SummaryItem label="Cliff">{hasCliffDate(draft.scheduleType) ? formatDraftDate(draft.cliffDateTime) : "No cliff"}</SummaryItem>
                  <SummaryItem label="Release behavior">{scheduleDescription(draft)}</SummaryItem>
                {draft.scheduleType === "Milestone" ? <SummaryItem label="Milestone">{draft.milestoneDescription || "Manual release"}</SummaryItem> : null}
                <SummaryItem label="Recipient changes">{recipientChange}</SummaryItem>
                {isMilestone ? (
                  <SummaryItem label="Release authority">{draft.authorityType === "SingleKey" ? shortenAddress(draft.releaseAuthorityWallet) : draft.authorityType}</SummaryItem>
                ) : null}
                <SummaryItem label="Cancel authority">{cancelAuthorityOptions.find((option) => option.value === draft.cancelAuthority)?.label ?? draft.cancelAuthority}</SummaryItem>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#fffeea]/12 pt-4">
                {permissionSummary.map((item) => (
                  <span className="rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] px-3 py-1.5 text-xs font-medium text-[#fffeea]/78" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </FieldCard>
          </aside>
        </div>
      </section>
    </WizardChrome>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-[#fffeea]/45">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-white md:truncate">{children}</div>
    </div>
  );
}

type CsvImportIssue = {
  row: number;
  message: string;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

function parseRecipientCsv(text: string) {
  const rows = parseCsv(text);
  const errors: CsvImportIssue[] = [];
  const recipients: VestingRecipient[] = [];

  if (!rows.length) return { recipients, errors: [{ row: 1, message: "CSV file is empty." }] };

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const titleIndex = headers.indexOf("title");
  const walletIndex = headers.indexOf("wallet");
  const amountIndex = headers.indexOf("amount");
  const missingColumns = [
    titleIndex === -1 ? "Title" : null,
    walletIndex === -1 ? "Wallet" : null,
    amountIndex === -1 ? "Amount" : null,
  ].filter(Boolean);

  if (missingColumns.length) {
    return {
      recipients,
      errors: [{ row: 1, message: `Missing required column${missingColumns.length > 1 ? "s" : ""}: ${missingColumns.join(", ")}.` }],
    };
  }

  rows.slice(1).forEach((row, index) => {
    const recipient: VestingRecipient = {
      id: createRecipientId(),
      title: row[titleIndex]?.trim() || "Vesting stream",
      wallet: row[walletIndex]?.trim() ?? "",
      amount: row[amountIndex]?.trim() ?? "",
      source: "csv",
    };
    const issue = getRecipientIssue(recipient);
    if (issue) {
      errors.push({ row: index + 2, message: issue });
      return;
    }
    recipients.push(recipient);
  });

  return { recipients, errors };
}

function downloadRecipientCsvTemplate() {
  const blob = new Blob(["Title,Wallet,Amount\nSeed allocation,RecipientPublicKey,1000\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "velora-recipients-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function RecipientsPage() {
  const { draft, setDraft } = useVestingDraft();
  const tokenBalance = useSelectedTokenBalance(draft.tokenMint);
  const recipients = draft.recipients;
  const recipientCount = recipients.length;
  const totalAmount = getRecipientsTotalAmount(recipients);
  const invalidRows = recipients.filter((recipient) => getRecipientIssue(recipient));
  const balanceIssue = recipientCount ? getBalanceIssue(tokenBalance, totalAmount) : null;
  const canContinue = recipientCount > 0 && invalidRows.length === 0 && !balanceIssue;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<VestingRecipient | null>(null);
  const [menuRecipientId, setMenuRecipientId] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<CsvImportIssue[]>([]);

  const openAddModal = () => {
    setEditingRecipient(null);
    setModalOpen(true);
  };

  const saveRecipient = (recipient: VestingRecipient) => {
    setDraft({
      recipients: editingRecipient ? recipients.map((item) => (item.id === editingRecipient.id ? recipient : item)) : [...recipients, recipient],
    });
    setModalOpen(false);
    setEditingRecipient(null);
  };

  const removeRecipient = (recipientId: string) => {
    setDraft({ recipients: recipients.filter((recipient) => recipient.id !== recipientId) });
    setMenuRecipientId(null);
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const result = parseRecipientCsv(text);
    setCsvErrors(result.errors);
    if (result.recipients.length) setDraft({ recipients: [...recipients, ...result.recipients] });
  };

  return (
    <WizardChrome
      step="Recipients"
      footer={
        <>
          <SecondaryButton href="/create-vesting/configuration">Back</SecondaryButton>
          <PrimaryButton disabled={!canContinue} href={canContinue ? "/create-vesting/review" : undefined}>
            Continue
          </PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[1132px] flex-col px-4 py-8 md:px-8 md:py-14">
        <h1 className="text-3xl font-semibold md:text-4xl">Recipients</h1>
        <div className="mt-8">
          <BalanceNotice issue={balanceIssue} state={tokenBalance} />
        </div>
        {recipientCount ? (
          <div className="mt-8 flex flex-col gap-6 md:mt-14 md:gap-7">
            <div className="grid gap-3">
              {recipients.map((recipient) => {
                const issue = getRecipientIssue(recipient);
                return (
                  <FieldCard className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-4 md:px-5" key={recipient.id}>
                    <div className="flex min-w-0 items-center gap-3">
                      <TokenIcon />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{recipient.title || "Vesting stream"}</div>
                        <div className="mt-1 text-sm text-[#fffeea]/58">
                          {recipient.amount || "0"} tokens · {recipient.wallet ? `${recipient.wallet.slice(0, 5)}...${recipient.wallet.slice(-5)}` : "No wallet"}
                        </div>
                        {issue ? <div className="mt-1 text-xs text-amber-200">{issue}</div> : null}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        aria-expanded={menuRecipientId === recipient.id}
                        aria-label="Open recipient actions"
                        className="grid size-9 place-items-center rounded-[4px] text-[#fffeea]/55 transition hover:bg-[#191b22] hover:text-[#fffeea]"
                        onClick={() => setMenuRecipientId((current) => (current === recipient.id ? null : recipient.id))}
                        type="button"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menuRecipientId === recipient.id ? (
                        <div className="absolute right-0 top-11 z-40 w-40 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#13151a] py-1 text-sm text-[#fffeea]/82 shadow-2xl shadow-black/50">
                          <button
                            className="block w-full px-4 py-2.5 text-left hover:bg-[#191b22]"
                            onClick={() => {
                              setMenuRecipientId(null);
                              setEditingRecipient(recipient);
                              setModalOpen(true);
                            }}
                            type="button"
                          >
                            Edit recipient
                          </button>
                          <button
                            className="block w-full px-4 py-2.5 text-left text-red-300 hover:bg-[#191b22]"
                            onClick={() => removeRecipient(recipient.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </FieldCard>
                );
              })}
            </div>
            <div className="flex flex-col gap-4 text-[#f2d467] sm:flex-row sm:justify-between sm:gap-8">
              <div className="text-sm text-[#fffeea]/58">
                {getValidRecipientCount(recipients)} valid of {recipientCount} recipients · {totalAmount ? formatTokenAmount(totalAmount) : "0"} tokens
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-end sm:gap-8">
                <button className="inline-flex items-center gap-2" onClick={openAddModal} type="button">
                  <Plus size={18} />
                  Add manually
                </button>
                <button className="inline-flex items-center gap-2" onClick={() => fileInputRef.current?.click()} type="button">
                  <Upload size={18} />
                  Upload CSV
                </button>
                <button className="inline-flex items-center gap-2" onClick={downloadRecipientCsvTemplate} type="button">
                  <FileText size={18} />
                  Download template
                </button>
              </div>
            </div>
            {csvErrors.length ? <CsvErrorList errors={csvErrors} /> : null}
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4 md:mt-14 md:gap-6">
            <button className="flex h-[68px] items-center justify-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] text-lg text-[#fffeea]/78" onClick={openAddModal} type="button">
              <Plus size={22} />
              Add manually
            </button>
            <button className="flex h-[68px] items-center justify-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] text-lg text-[#fffeea]/78" onClick={() => fileInputRef.current?.click()} type="button">
              <ArrowUp size={22} />
              Upload CSV
            </button>
            <button className="flex h-[68px] items-center justify-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] text-lg text-[#fffeea]/78" onClick={downloadRecipientCsvTemplate} type="button">
              <FileText size={22} />
              Download template
            </button>
            {csvErrors.length ? <CsvErrorList errors={csvErrors} /> : null}
          </div>
        )}
        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleCsvFile(file);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
      </section>
      {modalOpen ? <RecipientModal initialRecipient={editingRecipient} onClose={() => setModalOpen(false)} onSave={saveRecipient} /> : null}
    </WizardChrome>
  );
}

function CsvErrorList({ errors }: { errors: CsvImportIssue[] }) {
  return (
    <FieldCard className="p-4 text-sm text-amber-200">
      <div className="font-semibold">CSV rows skipped</div>
      <div className="mt-2 grid gap-1 text-xs leading-5">
        {errors.map((error) => (
          <div key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</div>
        ))}
      </div>
    </FieldCard>
  );
}

function RecipientModal({
  initialRecipient,
  onClose,
  onSave,
}: {
  initialRecipient: VestingRecipient | null;
  onClose: () => void;
  onSave: (recipient: VestingRecipient) => void;
}) {
  const editing = Boolean(initialRecipient);
  const [title, setTitle] = useState(initialRecipient?.title || "Vesting stream");
  const [amount, setAmount] = useState(initialRecipient?.amount || "1000");
  const [recipient, setRecipient] = useState(initialRecipient?.wallet || "");
  const nextRecipient: VestingRecipient = {
    id: initialRecipient?.id || createRecipientId(),
    title: title.trim() || "Vesting stream",
    amount,
    wallet: recipient,
    source: initialRecipient?.source || "manual",
  };
  const issue = getRecipientIssue(nextRecipient);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/62 px-4">
      <div className="max-h-[calc(100vh-32px)] w-full max-w-[614px] overflow-y-auto rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-5 shadow-2xl md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{editing ? "Edit recipient" : "Add recipient"}</h2>
          <button onClick={onClose} type="button">
            <X className="text-[#fffeea]/58" />
          </button>
        </div>
        <div className="mt-8 flex flex-col gap-6">
          <TextInput autoFocus label="Contract title" onChange={setTitle} placeholder="e.g. VC Seed Round" value={title} />
          <div>
            <TextInput label="Amount*" onChange={setAmount} placeholder="1000" prefix={<TokenIcon size="size-6" />} suffix="Max" value={amount} />
            <p className="mt-3 text-base text-[#fffeea]/58">Enter how many tokens this recipient should receive.</p>
          </div>
          <TextInput label="Recipient wallet address*" onChange={setRecipient} placeholder="Recipient public key" suffix={<FileText size={20} />} value={recipient} />
          {issue ? <p className="text-sm text-amber-200">{issue}</p> : null}
          <label className="flex items-center gap-3 text-base font-medium">
            <Toggle enabled={false} />
            Use connected wallet
          </label>
          <TextInput label="Recipient email address (Optional)" placeholder="hello@example.com" />
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton disabled={Boolean(issue)} onClick={() => onSave(nextRecipient)}>Save</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  placeholder,
  prefix,
  suffix,
  autoFocus = false,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-2 flex h-12 items-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 focus-within:border-[#f2d467]">
        {prefix}
        <input
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#fffeea] outline-none placeholder:text-[#fffeea]/40"
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
        {typeof suffix === "string" ? <span className="text-[#f2d467]">{suffix}</span> : suffix}
      </span>
    </label>
  );
}

function DateTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-2 flex h-12 items-center rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 focus-within:border-[#f2d467]">
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-[#fffeea] outline-none [color-scheme:dark]"
          onChange={(event) => onChange(event.target.value)}
          type="datetime-local"
          value={value}
        />
      </span>
    </label>
  );
}

function DetailGrid({ compact = false, draft = defaultVestingDraft }: { compact?: boolean; draft?: VestingDraft }) {
  const totalAmount = getRecipientsTotalAmount(draft.recipients);
  const items: Array<{ label: string; value: string; long?: boolean }> = [
    { label: "Contract title", value: draft.contractTitle || "Vesting stream" },
    { label: "Vesting type", value: scheduleLabel(draft.scheduleType) },
    { label: "Total amount", value: `${totalAmount ? formatTokenAmount(totalAmount) : "0"} tokens` },
    { label: "Token", value: tokenLabel(draft) },
    { label: "Mint", value: draft.tokenMint ? shortenAddress(draft.tokenMint) : "Not set" },
    { label: draft.scheduleType === "Milestone" ? "Release window" : "Start time", value: draft.scheduleType === "Milestone" ? "Until deadline" : draft.startsImmediately ? "Upon creation" : formatDraftDate(draft.startDateTime) },
    { label: draft.scheduleType === "Milestone" ? "Release deadline" : "End time", value: formatDraftDate(draft.endDateTime) },
    { label: "Cliff", value: hasCliffDate(draft.scheduleType) ? formatDraftDate(draft.cliffDateTime) : "No cliff" },
    { label: "Release behavior", value: scheduleDescription(draft) },
    { label: "Hybrid cliff amount", value: draft.scheduleType === "CliffLinear" ? `${draft.cliffAmount || "0"} tokens` : "Not used" },
    { label: "Number of recipients", value: String(draft.recipients.length) },
    { label: "Milestone", value: draft.scheduleType === "Milestone" ? draft.milestoneDescription || "Manual release" : "Not used" },
    { label: "Release authority", value: draft.scheduleType === "Milestone" ? (draft.authorityType === "SingleKey" ? shortenAddress(draft.releaseAuthorityWallet) : draft.authorityType) : "Not used" },
    { label: "Cancel authority", value: cancelAuthorityOptions.find((option) => option.value === draft.cancelAuthority)?.label ?? draft.cancelAuthority },
  ];
  return (
    <div className={`grid grid-cols-1 gap-x-10 gap-y-6 ${compact ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
      {items.map((item) => (
        <div className="min-w-0" key={item.label}>
          <div className="text-sm text-[#fffeea]/50">{item.label}</div>
          <div className="mt-2 truncate text-sm font-semibold text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-[#fffeea]/50">{label}</div>
      <div className="mt-1.5 break-words text-sm font-semibold text-white">{children}</div>
    </div>
  );
}

export function ReviewPage() {
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("idle");
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { draft } = useVestingDraft();
  const tokenBalance = useSelectedTokenBalance(draft.tokenMint);
  const requiredAmount = getRecipientsTotalAmount(draft.recipients);
  const balanceIssue = getBalanceIssue(tokenBalance, requiredAmount);
  const scheduleIssue = getScheduleIssue(draft);
  const { walletPublicKey, connect, createStream } = useVeloraChain();
  const invalidRecipient = draft.recipients.find((recipient) => getRecipientIssue(recipient));
  const recipientIssue = !draft.recipients.length
    ? "Add at least one recipient."
    : invalidRecipient
      ? `${invalidRecipient.title || "Recipient"}: ${getRecipientIssue(invalidRecipient)}`
      : null;

  const handleCreate = async () => {
    setSubmitting(true);
    setTransactionStage("wallet_approval");
    setSubmitProgress(null);
    setSubmitError(null);
    setCreatedCount(0);
    let successful = 0;
    try {
      if (!walletPublicKey) await connect();
      setTransactionStage("sending");
      await delay(150);
      const startTimestamp = draft.scheduleType === "Milestone" || draft.startsImmediately ? Math.floor(Date.now() / 1000) : parseLocalDateTime(draft.startDateTime, "Start date");
      const endTimestamp = parseLocalDateTime(draft.endDateTime, "End date");
      const cliffTimestamp = hasCliffDate(draft.scheduleType) ? parseLocalDateTime(draft.cliffDateTime, "Cliff date") : 0;
      const authorityType = draft.scheduleType === "Milestone" ? draft.authorityType : "None";
      const releaseAuthority = draft.scheduleType === "Milestone" && draft.authorityType === "SingleKey" ? parsePublicKey(draft.releaseAuthorityWallet, "Release authority wallet") : null;
      const mint = parsePublicKey(draft.tokenMint, "SPL mint");
      const cliffAmount = draft.scheduleType === "CliffLinear" ? parseRawAmountAllowZero(draft.cliffAmount) : BigInt(0);
      const baseStreamId = BigInt(Date.now());

      for (let index = 0; index < draft.recipients.length; index += 1) {
        const recipient = draft.recipients[index];
        setSubmitProgress(`Creating ${index + 1} of ${draft.recipients.length}...`);
        const input: CreateStreamInput = {
          streamId: baseStreamId + BigInt(index),
          mint,
          recipient: parsePublicKey(recipient.wallet, "Recipient wallet"),
          totalAmount: parseRawAmount(recipient.amount),
          startTimestamp,
          endTimestamp,
          cliffTimestamp,
          cliffAmount,
          scheduleType: draft.scheduleType,
          authorityType,
          releaseAuthority,
          milestoneDescription: draft.milestoneDescription,
          isCancellable: draft.cancelAuthority !== "Neither" && draft.cancellable,
          cancelAuthority: draft.cancelAuthority,
        };
        const result = await createStream(input);
        successful += 1;
        setCreatedCount(successful);
        saveVestingMetadata([
          result.streamConfig.toBase58(),
          `${result.creator.toBase58()}:${result.recipient.toBase58()}:${result.streamId}`,
        ], {
          title: recipient.title || draft.contractTitle || "Vesting stream",
        });
      }

      setTransactionStage("confirming");
      setTransactionStage("success");
      setSuccessOpen(true);
    } catch (error) {
      setTransactionStage("error");
      const message = error instanceof Error ? error.message : "Could not create vesting stream.";
      setSubmitError(successful > 0 ? `Created ${successful} of ${draft.recipients.length} streams. Remaining streams were not created: ${message}` : message);
    } finally {
      setSubmitProgress(null);
      setSubmitting(false);
    }
  };

  return (
    <WizardChrome
      step="Review"
      footer={
        <>
          <SecondaryButton href="/create-vesting/recipients">Back</SecondaryButton>
          <PrimaryButton disabled={submitting || Boolean(balanceIssue) || Boolean(scheduleIssue) || Boolean(recipientIssue)} onClick={() => void handleCreate()}>
            {submitting ? submitProgress ?? "Creating..." : "Create Vesting"}
          </PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[536px] flex-col gap-6 px-4 py-8 md:gap-7 md:px-0 md:py-9">
        <h1 className="text-3xl font-semibold">Review</h1>
        <FieldCard className="flex items-center gap-3 p-3 text-xs text-[#fffeea]/70">
          <span className="text-amber-400">▲</span>
          This devnet action creates a real SPL-token vesting stream.
        </FieldCard>
        <BalanceNotice issue={balanceIssue} state={tokenBalance} />
        {scheduleIssue ? <FieldCard className="p-4 text-sm text-amber-200">{scheduleIssue}</FieldCard> : null}
        {transactionStage !== "idle" && transactionStage !== "error" ? (
          <FieldCard className="p-4 text-sm text-[#fffeea]/70">{transactionStageLabel(transactionStage)}</FieldCard>
        ) : null}
        {submitProgress ? <FieldCard className="p-4 text-sm text-[#fffeea]/70">{submitProgress}</FieldCard> : null}
        {createdCount > 0 && submitting ? <FieldCard className="p-4 text-sm text-[#fffeea]/70">Created {createdCount} of {draft.recipients.length} streams.</FieldCard> : null}
        {submitError ? <FieldCard className="p-4 text-sm text-red-300">{submitError}</FieldCard> : null}
        {recipientIssue ? <FieldCard className="p-4 text-sm text-amber-200">{recipientIssue}</FieldCard> : null}
        <h2 className="text-base font-semibold">Contract details</h2>
        <DetailGrid draft={draft} />
        <hr className="border-[#fffeea]/12" />
        <h2 className="text-base font-semibold">Recipients</h2>
        <div className="grid gap-3">
          {draft.recipients.map((recipient) => (
            <FieldCard className="flex min-h-11 flex-wrap items-center gap-3 px-4 py-3 text-sm" key={recipient.id}>
              <TokenIcon size="size-5" />
              <span className="font-semibold">{recipient.title || "Vesting stream"}</span>
              <span className="text-[#fffeea]/58">{recipient.amount} tokens</span>
              <span className="text-[#fffeea]/58">{recipient.wallet ? `${recipient.wallet.slice(0, 5)}...${recipient.wallet.slice(-5)}` : "No recipient"}</span>
            </FieldCard>
          ))}
        </div>
        <hr className="border-[#fffeea]/12" />
        <h2 className="text-base font-semibold">Fees</h2>
        <FieldCard className="flex items-center justify-between p-4 text-sm">
          <span>Network and rent fees paid by connected wallet</span>
          <ChevronDown size={18} />
        </FieldCard>
      </section>
      {successOpen ? <SuccessModal count={createdCount || draft.recipients.length} /> : null}
    </WizardChrome>
  );
}

function SuccessModal({ count }: { count: number }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/64 px-4">
      <div className="w-full max-w-[520px] rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-8 text-center shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#143c22] text-[#47d16c]">
          <Check size={34} />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">Vesting created</h2>
        <p className="mt-3 text-[#fffeea]/62">
          {count === 1 ? "Your devnet vesting stream was created on-chain." : `${count} devnet vesting streams were created on-chain.`}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <SecondaryButton>Share on X</SecondaryButton>
          <SecondaryButton href="/create-vesting/type">Create again</SecondaryButton>
          <PrimaryButton href="/vesting">View list</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const { streams, walletPublicKey, cancel, releaseMilestone, withdraw } = useVeloraChain();
  const metadata = useVestingMetadata();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const stream = streams.find((item) => item.publicKey.toBase58() === params.id);
  const isCreator = Boolean(stream && walletPublicKey?.equals(stream.creator));
  const isRecipient = Boolean(stream && walletPublicKey?.equals(stream.recipient));

  if (!stream) {
    return (
      <AppShell>
        <FieldCard className="p-6 text-sm text-[#fffeea]/62">Connect the related wallet or refresh the list to load this devnet stream.</FieldCard>
      </AppShell>
    );
  }

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    setBusyAction(label);
    setTransactionStage("wallet_approval");
    setActionError(null);
    try {
      await delay(150);
      setTransactionStage("sending");
      await action();
      setTransactionStage("confirming");
      await delay(150);
      setTransactionStage("success");
      await delay(900);
      setTransactionStage("idle");
    } catch (error) {
      setTransactionStage("error");
      setActionError(error instanceof Error ? error.message : "Transaction failed.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-[842px] flex-col gap-6 pb-8 pt-2 sm:gap-7 sm:pb-10 sm:pt-4 md:gap-8">
        <div className="flex flex-col gap-5 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{streamStatusLabel(stream)}</span>
                <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#fffeea]/14 px-3 py-1 text-xs text-[#fffeea]/78">
                  <Lock className="text-amber-400" size={13} />
                  {stream.isCancellable ? "Creator cancellable" : "Non-cancellable"}
                </span>
              </div>
              <h1 className="break-words text-xl font-semibold leading-tight text-white sm:text-2xl">{streamTitle(stream, metadata)}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#fffeea]/50">
                <span>{stream.publicKey.toBase58().slice(0, 5)}...{stream.publicKey.toBase58().slice(-5)}</span>
                <Copy className="text-[#fffeea]/55" size={14} />
                <span className="hidden sm:inline">·</span>
                <span>{scheduleLabel(stream.scheduleType)} vesting</span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3 md:shrink-0 [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">
              {isRecipient ? (
                <PrimaryButton disabled={stream.claimableAmount === BigInt(0) || busyAction === "claim"} onClick={() => void runAction("claim", () => withdraw(stream))}>
                  {busyAction === "claim" ? "Claiming..." : "Claim"}
                </PrimaryButton>
              ) : null}
              {isCreator && stream.scheduleType === "Milestone" && !stream.milestoneReleased ? (
                <SecondaryButton disabled={busyAction === "milestone"} onClick={() => void runAction("milestone", () => releaseMilestone(stream))}>
                  Release milestone
                </SecondaryButton>
              ) : null}
              {isCreator && stream.status === "Active" && stream.isCancellable ? (
                <SecondaryButton disabled={busyAction === "cancel"} onClick={() => setCancelConfirmOpen(true)}>
                  Cancel
                </SecondaryButton>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldCard className="min-w-0 p-4">
              <div className="text-xs text-[#fffeea]/50">Total amount</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-base font-semibold sm:text-lg">
                <TokenIcon size="size-5" />
                {formatTokenAmount(stream.totalAmount)}
              </div>
            </FieldCard>
            <FieldCard className="min-w-0 p-4">
              <div className="text-xs text-[#fffeea]/50">Recipient</div>
              <div className="mt-2 text-base font-semibold sm:text-lg">{stream.recipient.toBase58().slice(0, 5)}...{stream.recipient.toBase58().slice(-5)}</div>
            </FieldCard>
            <FieldCard className="min-w-0 p-4">
              <div className="text-xs text-[#fffeea]/50">Schedule</div>
              <div className="mt-2 text-base font-semibold sm:text-lg">{scheduleLabel(stream.scheduleType)}</div>
            </FieldCard>
          </div>
        </div>

        {actionError ? <FieldCard className="p-4 text-sm text-red-300">{actionError}</FieldCard> : null}
        {transactionStage !== "idle" ? (
          <FieldCard className={`p-4 text-sm ${transactionStage === "error" ? "text-red-300" : "text-[#fffeea]/70"}`}>
            {transactionStageLabel(transactionStage)}
          </FieldCard>
        ) : null}

        <hr className="border-[#fffeea]/12" />

        <SectionTitle>Contract details</SectionTitle>
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Vesting type">{scheduleLabel(stream.scheduleType)}</InfoItem>
          <InfoItem label="Total">
            <span className="inline-flex items-center gap-2">
              <TokenIcon size="size-4" /> {formatTokenAmount(stream.totalAmount)} <span className="text-xs text-[#fffeea]/42">tokens</span>
            </span>
          </InfoItem>
          <InfoItem label="Unlocked">{formatTokenAmount(stream.unlockedAmount)}</InfoItem>
          <InfoItem label="Claimed">{formatTokenAmount(stream.amountClaimed)}</InfoItem>
          <InfoItem label="Claimable">{formatTokenAmount(stream.claimableAmount)}</InfoItem>
          <InfoItem label="Time remaining">{timeRemainingLabel(stream)}</InfoItem>
          <InfoItem label="Start time">{formatDate(stream.startTimestamp)}</InfoItem>
          <InfoItem label="End time">{formatDate(stream.endTimestamp)}</InfoItem>
        </div>

        <hr className="border-[#fffeea]/12" />

        <SectionTitle>Participants & settings</SectionTitle>
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Sender">
            {stream.creator.toBase58().slice(0, 5)}...{stream.creator.toBase58().slice(-5)} <Copy className="inline text-[#fffeea]/55" size={13} />
          </InfoItem>
          <InfoItem label="Recipient">
            {stream.recipient.toBase58().slice(0, 5)}...{stream.recipient.toBase58().slice(-5)} <Copy className="inline text-[#fffeea]/55" size={13} />
          </InfoItem>
          <InfoItem label="Token">
            {stream.mint.toBase58().slice(0, 5)}...{stream.mint.toBase58().slice(-5)} <Copy className="inline text-[#fffeea]/55" size={13} />
          </InfoItem>
          <InfoItem label="Who can cancel">{stream.isCancellable ? "Creator" : "Nobody"}</InfoItem>
          <InfoItem label="Milestone">{stream.scheduleType === "Milestone" ? (stream.milestoneReleased ? "Released" : "Waiting") : "Not used"}</InfoItem>
        </div>
      </section>
      {cancelConfirmOpen ? (
        <CancelConfirmationDialog
          busy={busyAction === "cancel"}
          onClose={() => setCancelConfirmOpen(false)}
          onConfirm={() => {
            setCancelConfirmOpen(false);
            void runAction("cancel", () => cancel(stream));
          }}
          stream={stream}
          title={streamTitle(stream, metadata)}
        />
      ) : null}
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-white">{children}</h2>;
}

function CancelConfirmationDialog({
  busy,
  onClose,
  onConfirm,
  stream,
  title,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stream: StreamView;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/64 px-4">
      <div className="w-full max-w-[520px] rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Cancel vesting stream?</h2>
            <p className="mt-2 text-sm leading-5 text-[#fffeea]/58">
              Unlocked tokens can go to the recipient and locked tokens return to the creator.
            </p>
          </div>
          <button className="text-[#fffeea]/58 transition hover:text-white" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <FieldCard className="mt-6 grid gap-4 p-4 text-sm">
          <SummaryItem label="Stream">{title}</SummaryItem>
          <SummaryItem label="Total">{formatTokenAmount(stream.totalAmount)} tokens</SummaryItem>
          <SummaryItem label="Unlocked">{formatTokenAmount(stream.unlockedAmount)} tokens</SummaryItem>
          <SummaryItem label="Recipient">{stream.recipient.toBase58()}</SummaryItem>
        </FieldCard>
        <div className="mt-7 flex justify-end gap-3">
          <SecondaryButton disabled={busy} onClick={onClose}>Keep stream</SecondaryButton>
          <PrimaryButton disabled={busy} onClick={onConfirm}>{busy ? "Canceling..." : "Confirm cancel"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppShell>
      <div className="grid min-h-[520px] place-items-center text-center">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-3 text-[#fffeea]/58">This section is outside the current vesting prototype slice.</p>
        </div>
      </div>
    </AppShell>
  );
}
