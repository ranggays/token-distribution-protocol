"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CirclePlay,
  Copy,
  FileText,
  Filter,
  Home,
  Hourglass,
  Info,
  ListFilter,
  Lock,
  Menu,
  MoreHorizontal,
  PackageOpen,
  PanelLeft,
  Plus,
  Search,
  Timer,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  connectedWallet,
  contractHref,
  defaultRecipient,
  mockContract,
  storageKey,
} from "@/lib/velora-prototype";

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
  { label: "Price-based vesting", icon: CircleDollarSign, href: "/create-vesting/type" },
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

const claimRows = [
  {
    amount: "0.05 SOL",
    amountUsd: "$0.00007836",
    type: "Linear",
    recipient: defaultRecipient.short,
    status: "Ongoing",
    startDate: "May 22, 2026 at 2:02 PM",
  },
  {
    amount: "0.5 SOL",
    amountUsd: "$0.0007836",
    type: "Linear",
    recipient: defaultRecipient.short,
    status: "Ongoing",
    startDate: "May 22, 2026 at 1:36 PM",
  },
];

const createdContractEvent = "velora-created-contract";
const sidebarCollapsedStorageKey = "velora-sidebar-collapsed";
const sidebarCollapsedEvent = "velora-sidebar-collapsed";

type SelectOption = {
  label: string;
  value: string;
};

const tokenOptions: SelectOption[] = [
  { label: "Solana (SOL)", value: "Solana (SOL)" },
  { label: "USDC", value: "USDC" },
  { label: "Bonk (BONK)", value: "Bonk (BONK)" },
];

const durationUnitOptions: SelectOption[] = [
  { label: "Month", value: "Month" },
  { label: "Week", value: "Week" },
  { label: "Day", value: "Day" },
];

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

function readCreatedContractSnapshot() {
  return localStorage.getItem(storageKey) === "true";
}

function readCreatedContractServerSnapshot() {
  return false;
}

function subscribeToCreatedContractStore(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(createdContractEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(createdContractEvent, onStoreChange);
  };
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
  return (
    <button className="sf-search flex h-11 items-center gap-2 rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-sm text-[#fffeea]" type="button">
      <TokenIcon size="size-7" />
      <span className="hidden sm:inline">{connectedWallet.short}</span>
      <ChevronDown className="text-[#fffeea]/55" size={18} />
    </button>
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

function AppHeader() {
  return (
    <header className="sf-header flex h-[72px] items-center justify-end gap-2.5 border-b border-[#fffeea]/12 bg-[#06070a] md:px-10 lg:col-start-2">
      <label className="sf-search mr-auto hidden h-10 w-full max-w-[312px] items-center gap-2 rounded-md border border-[#fffeea]/15 bg-[#0b0d11] text-sm text-[#fffeea]/45 shadow-sm sm:flex">
        <Search size={20} />
        <span>Search</span>
      </label>
      <button className="flex size-10 items-center justify-center rounded-xl border border-[#fffeea]/15 bg-[#0b0d11] text-[#fffeea]/70" type="button">
        <Bell size={20} />
      </button>
      <ConnectedWalletButton />
      <button className="flex size-10 items-center justify-center rounded-xl text-[#fffeea]/70 lg:hidden" type="button">
        <Menu size={24} />
      </button>
    </header>
  );
}

export function AppShell({ children, maxWidth = "max-w-[1120px]" }: { children: React.ReactNode; maxWidth?: string }) {
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
        <AppHeader />
        <div className="min-h-0 overflow-y-auto lg:col-start-2">
          <div className={`sf-content mx-auto flex w-full ${maxWidth} flex-col px-5 py-8 md:px-8`}>{children}</div>
        </div>
      </div>
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
    "inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea] bg-[#fffeea] px-4 text-sm font-medium !text-[#06070a] shadow-sm transition hover:border-[#f2d467] hover:bg-[#f2d467] hover:!text-[#06070a] disabled:cursor-not-allowed disabled:opacity-45";
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
    "inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#fffeea]/18 bg-[#13151a] px-4 text-sm font-medium text-[#fffeea]/82 transition hover:border-[#fffeea]/35 hover:bg-[#191b22] disabled:cursor-not-allowed disabled:opacity-45";
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
          <h1 className="text-xl font-semibold leading-7 tracking-normal">The USD+ waitlist is live!</h1>
          <p className="max-w-[34rem] text-sm leading-5 text-[#fffeea]/58">
            Introducing USD+, a stablecoin backed by U.S. Treasuries that distributes daily yield from one streamlined vesting workspace.
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
  return (
    <AppShell maxWidth="max-w-[1120px]">
      <div className="flex flex-col gap-[68px]">
        <HeroBanner />
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

function useCreatedContract() {
  const created = useSyncExternalStore(
    subscribeToCreatedContractStore,
    readCreatedContractSnapshot,
    readCreatedContractServerSnapshot,
  );

  const saveCreated = () => {
    localStorage.setItem(storageKey, "true");
    window.dispatchEvent(new Event(createdContractEvent));
  };

  return { created, saveCreated };
}

export function VestingPage() {
  const { created } = useCreatedContract();

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
        <div className="flex gap-8 border-b border-[#fffeea]/14 text-sm">
          {["All", "Ongoing", "Scheduled", "Completed", "Canceled"].map((tab) => (
            <button className={`pb-4 ${tab === "All" ? "border-b-2 border-[#f2d467] text-[#fffeea]" : "text-[#fffeea]/55"}`} key={tab} type="button">
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <SecondaryButton>
              <ListFilter size={18} />
              Sorted by <span className="font-semibold text-white">default</span>
            </SecondaryButton>
            <SecondaryButton>
              <Filter size={18} />
              Filters
            </SecondaryButton>
          </div>
          <label className="flex h-11 w-full items-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 text-[#fffeea]/45 md:max-w-[320px]">
            <Search size={20} />
            <span>Search</span>
          </label>
        </div>
        {created ? <VestingTable /> : <VestingEmptyState />}
      </section>
    </AppShell>
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

function VestingTable() {
  const [menuOpen, setMenuOpen] = useState(false);
  const columns = ["Amount", "Contract", "Type", "Transaction", "Recipient", "Status", "Start date"];
  return (
    <div className="overflow-visible">
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
          <tr className="cursor-pointer border-t border-[#fffeea]/12 transition hover:bg-[#13151a]" onClick={() => (window.location.href = contractHref())}>
            <td className="px-3 py-5">
              <div className="flex items-center gap-3">
                <TokenIcon />
                <div>
                  <div className="font-semibold text-white">{mockContract.amount}</div>
                  <div className="text-xs text-[#fffeea]/50">{mockContract.amountUsd}</div>
                </div>
              </div>
            </td>
            <td className="px-3 py-5">
              <div className="font-semibold text-white">{mockContract.title}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-[#fffeea]/58">4c94E...HMERt <Copy size={14} /></div>
            </td>
            <td className="px-3 py-5 font-medium text-white">{mockContract.type}</td>
            <td className="px-3 py-5 font-medium text-white">{mockContract.transaction}</td>
            <td className="px-3 py-5 font-medium text-white">{mockContract.recipientShort}</td>
            <td className="px-3 py-5">
              <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{mockContract.status}</span>
            </td>
            <td className="px-3 py-5 font-medium text-white">{mockContract.startDate}</td>
            <td className="relative px-3 py-5 text-[#fffeea]/62">
              <button
                aria-expanded={menuOpen}
                aria-label="Open contract actions"
                className="grid size-8 place-items-center rounded-[4px] text-[#fffeea]/62 transition hover:bg-[#13151a] hover:text-[#fffeea]"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                type="button"
              >
                <MoreHorizontal size={20} />
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-3 top-12 z-50 w-48 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#13151a] py-1 text-sm text-[#fffeea]/82 shadow-2xl shadow-black/50"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Link className="block px-4 py-2.5 hover:bg-[#191b22]" href={contractHref()}>
                    View details
                  </Link>
                  <button className="block w-full px-4 py-2.5 text-left hover:bg-[#191b22]" type="button">
                    Copy contract address
                  </button>
                  <button className="block w-full px-4 py-2.5 text-left hover:bg-[#191b22]" type="button">
                    Share
                  </button>
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ClaimPage() {
  const tabs = ["Vesting"];

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
          <div className="flex gap-3">
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

        <ClaimTable />
      </section>
    </AppShell>
  );
}

function ClaimTable() {
  return (
    <div className="overflow-x-auto">
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
          {claimRows.map((row) => (
            <tr className="transition hover:bg-[#13151a]" key={`${row.amount}-${row.startDate}`}>
              <td className="px-3 py-5">
                <div className="flex items-center gap-3">
                  <TokenIcon />
                  <div>
                    <div className="font-semibold text-white">{row.amount}</div>
                    <div className="mt-1 text-xs text-[#fffeea]/50">{row.amountUsd}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-5 font-medium text-white">{row.type}</td>
              <td className="px-3 py-5">
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  {row.recipient}
                  <Copy className="text-[#fffeea]/55" size={14} />
                </span>
              </td>
              <td className="px-3 py-5">
                <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">{row.status}</span>
              </td>
              <td className="px-3 py-5">
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  {row.startDate}
                  <Info className="text-[#fffeea]/50" size={16} />
                </span>
              </td>
              <td className="px-3 py-5 text-[#fffeea]/62">
                <MoreHorizontal size={20} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WizardChrome({ children, step, footer }: { children: React.ReactNode; step: string; footer: React.ReactNode }) {
  const steps = ["Type", "Configuration", "Recipients", "Review"];
  const activeIndex = steps.indexOf(step);
  return (
    <main className="flex min-h-screen flex-col bg-[#06070a] font-[var(--font-primary),ui-sans-serif,system-ui,sans-serif] text-[#fffeea]">
      <header className="flex min-h-16 items-center justify-between border-b border-[#fffeea]/12 px-5 text-[#fffeea]/58 md:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm md:gap-3">
          <Home size={18} />
          {steps.slice(0, activeIndex + 1).map((item) => (
            <span className="flex min-w-0 items-center gap-2 md:gap-3" key={item}>
              <ChevronRight size={16} />
              <span className={`truncate ${item === step ? "font-semibold text-white" : ""}`}>{item}</span>
            </span>
          ))}
        </div>
        <Link href="/vesting" aria-label="Close create flow">
          <X size={20} />
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
      <footer className="sticky bottom-0 z-20 border-t border-[#fffeea]/12 bg-[#06070a] px-8 py-5">
        <div className="mx-auto flex w-full max-w-[1132px] items-center justify-between">{footer}</div>
      </footer>
    </main>
  );
}

export function TypePage() {
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
      <section className="mx-auto flex min-h-[760px] max-w-[802px] flex-col items-center justify-center">
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Choose type</h1>
        <p className="mt-4 text-2xl text-[#fffeea]/62">Choose the vesting type you would like to create.</p>
        <div className="mt-12 grid w-full grid-cols-1 gap-7 md:grid-cols-2">
          <FieldCard className="border-[#f2d467] p-8">
            <CalendarDays className="text-[#f2d467]" size={44} />
            <h2 className="mt-14 text-lg font-semibold">Linear</h2>
            <p className="mt-3 text-base leading-6 text-[#fffeea]/62">Contract that gradually releases tokens to recipients after a certain period of time.</p>
          </FieldCard>
          <FieldCard className="relative p-8">
            <span className="absolute right-3 top-3 rounded-full bg-[#f2d467]/14 px-3 py-1 text-sm text-[#f2d467]">Beta</span>
            <CircleDollarSign className="text-[#fffeea]/42" size={44} />
            <h2 className="mt-14 text-lg font-semibold">Price-based</h2>
            <p className="mt-3 text-base leading-6 text-[#fffeea]/62">Dynamically adjusts token unlocks based on market performance metrics.</p>
          </FieldCard>
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
        <span>{value}</span>
        <ChevronDown className={`text-[#fffeea]/45 transition ${open ? "rotate-180" : ""}`} size={18} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[4px] border border-[#fffeea]/16 bg-[#13151a] py-1 shadow-2xl shadow-black/40">
          {options.map((option) => (
            <button
              className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#191b22] ${option.value === value ? "text-[#fffeea]" : "text-[#fffeea]/62"}`}
              key={option.value}
              onClick={() => {
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
  const [token, setToken] = useState("Solana (SOL)");
  const [duration, setDuration] = useState(12);
  const [durationUnit, setDurationUnit] = useState("Month");
  const [unlockSchedule, setUnlockSchedule] = useState("Monthly");
  const [startsImmediately, setStartsImmediately] = useState(true);
  const [cliffEnabled, setCliffEnabled] = useState(false);
  const [recipientChange, setRecipientChange] = useState("Only Sender");
  const [cancellable, setCancellable] = useState(true);
  const [autoClaim, setAutoClaim] = useState(true);
  const [listedForSale, setListedForSale] = useState(false);
  const durationSummary = `${duration} ${durationUnit.toLowerCase()}${duration === 1 ? "" : "s"}`;
  const permissionSummary = [
    cancellable ? "Cancellable" : "Non-cancellable",
    autoClaim ? "Auto-claim" : "Manual claim",
    listedForSale ? "Listed for sale" : "Not listed",
  ];

  return (
    <WizardChrome
      step="Configuration"
      footer={
        <>
          <SecondaryButton href="/create-vesting/type">Back</SecondaryButton>
          <PrimaryButton href="/create-vesting/recipients">Continue</PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Configuration</h1>
          <p className="text-sm text-[#fffeea]/58">Set the token, release cadence, and contract permissions.</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-5">
              <h2 className="text-sm font-semibold text-[#fffeea]/78">Vesting setup</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectBox label="Token" onChange={setToken} options={tokenOptions} value={token} required />
                <div>
                  <label className="text-sm font-semibold">Vesting Duration*</label>
                  <div className="mt-2 grid grid-cols-[1fr_128px] gap-3">
                    <div className="flex h-12 items-center rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 focus-within:border-[#f2d467]">
                      <input
                        aria-label="Vesting duration"
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                        max={60}
                        min={1}
                        onChange={(event) => setDuration(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
                        type="number"
                        value={duration}
                      />
                    </div>
                    <SelectBox onChange={setDurationUnit} options={durationUnitOptions} value={durationUnit} />
                  </div>
                </div>
                <SelectBox label="Unlock schedule" onChange={setUnlockSchedule} options={unlockScheduleOptions} value={unlockSchedule} required />
                <SelectBox label="Who can change the recipient?" onChange={setRecipientChange} options={recipientChangeOptions} value={recipientChange} />
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold text-[#fffeea]/78">Vesting start date</h2>
                <FieldCard className="mt-2 flex min-h-[92px] items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-semibold">{startsImmediately ? "Upon contract creation" : "Schedule manually"}</div>
                    <div className="mt-1 text-xs text-[#fffeea]/50">
                      {startsImmediately ? "The unlock period begins once the contract is created" : "The contract will wait for a selected start date"}
                    </div>
                  </div>
                  <Toggle enabled={startsImmediately} label="Toggle immediate start" onChange={setStartsImmediately} />
                </FieldCard>
                {!startsImmediately ? (
                  <div className="mt-3 flex h-12 items-center rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 text-sm text-[#fffeea]/78">
                    May 22, 2026 at 2:00 PM
                  </div>
                ) : null}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#fffeea]/78">Cliff configuration</h2>
                <FieldCard className="mt-2 flex min-h-[92px] items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-semibold">{cliffEnabled ? "Cliff amount enabled" : "Add cliff amount"}</div>
                    <div className="mt-1 text-xs text-[#fffeea]/50">
                      {cliffEnabled ? "20% releases before the linear vesting schedule" : "Amount released when vesting contract starts"}
                    </div>
                  </div>
                  <Toggle enabled={cliffEnabled} label="Toggle cliff amount" onChange={setCliffEnabled} />
                </FieldCard>
                {cliffEnabled ? (
                  <div className="mt-3 flex h-12 items-center justify-between rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] px-4 text-sm">
                    <span className="text-[#fffeea]/50">Cliff amount</span>
                    <span className="font-semibold text-white">20%</span>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[#fffeea]/78">Contract permissions</h2>
              <FieldCard className="divide-y divide-[#fffeea]/12 p-4">
                {[
                  {
                    title: "Cancellable",
                    text: "Make this contract cancellable by its creator",
                    enabled: cancellable,
                    onChange: setCancellable,
                  },
                  {
                    title: "Auto-claim",
                    text: "Send tokens to recipients' wallet automatically.",
                    enabled: autoClaim,
                    onChange: setAutoClaim,
                  },
                  {
                    title: "List for sale",
                    text: "Make this contract tradable immediately after creation.",
                    enabled: listedForSale,
                    onChange: setListedForSale,
                  },
                ].map((option) => (
                  <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={option.title}>
                    <div>
                      <div className="text-sm font-semibold">{option.title}</div>
                      <div className="mt-1 text-xs text-[#fffeea]/50">{option.text}</div>
                    </div>
                    <Toggle enabled={option.enabled} label={`Toggle ${option.title}`} onChange={option.onChange} />
                  </div>
                ))}
              </FieldCard>
            </section>
          </div>

          <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-[#fffeea]/78">Configuration summary</h2>
            <FieldCard className="p-4">
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-1">
                <SummaryItem label="Token">{token}</SummaryItem>
                <SummaryItem label="Duration">{durationSummary}</SummaryItem>
                <SummaryItem label="Unlock schedule">{unlockSchedule}</SummaryItem>
                <SummaryItem label="Start date">{startsImmediately ? "Upon contract creation" : "May 22, 2026 at 2:00 PM"}</SummaryItem>
                <SummaryItem label="Cliff">{cliffEnabled ? "20% released at start" : "No cliff amount"}</SummaryItem>
                <SummaryItem label="Recipient changes">{recipientChange}</SummaryItem>
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
      <div className="mt-1 truncate text-sm font-semibold text-white">{children}</div>
    </div>
  );
}

export function RecipientsPage() {
  const [recipientSaved, setRecipientSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <WizardChrome
      step="Recipients"
      footer={
        <>
          <SecondaryButton href="/create-vesting/configuration">Back</SecondaryButton>
          <PrimaryButton disabled={!recipientSaved} href={recipientSaved ? "/create-vesting/review" : undefined}>
            Continue
          </PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[1132px] flex-col py-14">
        <h1 className="text-4xl font-semibold">Recipients</h1>
        {recipientSaved ? (
          <div className="mt-14 flex flex-col gap-7">
            <FieldCard className="flex h-[68px] items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <TokenIcon />
                <span className="font-semibold">0.5 SOL</span>
                <span className="text-[#fffeea]/58">{defaultRecipient.short}</span>
              </div>
              <MoreHorizontal className="text-[#fffeea]/55" />
            </FieldCard>
            <div className="flex justify-end gap-8 text-[#f2d467]">
              <button className="inline-flex items-center gap-2" onClick={() => setModalOpen(true)} type="button">
                <Plus size={18} />
                Add manually
              </button>
              <button className="inline-flex items-center gap-2" type="button">
                <Upload size={18} />
                Upload CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-14 flex flex-col gap-6">
            <button className="flex h-[68px] items-center justify-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] text-lg text-[#fffeea]/78" onClick={() => setModalOpen(true)} type="button">
              <Plus size={22} />
              Add manually
            </button>
            <button className="flex h-[68px] items-center justify-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] text-lg text-[#fffeea]/78" type="button">
              <ArrowUp size={22} />
              Upload CSV
            </button>
          </div>
        )}
      </section>
      {modalOpen ? <RecipientModal onClose={() => setModalOpen(false)} onSave={() => { setRecipientSaved(true); setModalOpen(false); }} /> : null}
    </WizardChrome>
  );
}

function RecipientModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/62 px-4">
      <div className="w-full max-w-[614px] rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Add recipient</h2>
          <button onClick={onClose} type="button">
            <X className="text-[#fffeea]/58" />
          </button>
        </div>
        <div className="mt-8 flex flex-col gap-6">
          <TextInput autoFocus label="Contract title" placeholder="e.g. VC Seed Round" />
          <div>
            <TextInput label="Amount*" placeholder="0.00" prefix={<TokenIcon size="size-6" />} suffix="Max" />
            <p className="mt-3 text-base text-[#fffeea]/58">Remaining amount: <span className="font-semibold text-[#fffeea]">3.316 SOL</span></p>
          </div>
          <TextInput label="Wallet address (Optional)" placeholder="Select contact" suffix={<FileText size={20} />} />
          <label className="flex items-center gap-3 text-base font-medium">
            <Toggle enabled={false} />
            Use connected wallet
          </label>
          <TextInput label="Recipient email address (Optional)" placeholder="hello@example.com" />
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onSave}>Save</PrimaryButton>
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
}: {
  label: string;
  placeholder: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-base font-semibold">{label}</span>
      <span className="mt-3 flex h-[54px] items-center gap-3 rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] px-4 focus-within:border-[#f2d467]">
        {prefix}
        <input
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent text-base text-[#fffeea] outline-none placeholder:text-[#fffeea]/40"
          placeholder={placeholder}
        />
        {typeof suffix === "string" ? <span className="text-[#f2d467]">{suffix}</span> : suffix}
      </span>
    </label>
  );
}

function DetailGrid({ compact = false }: { compact?: boolean }) {
  const items = [
    ["Vesting type", mockContract.type],
    ["Total amount", mockContract.amount],
    ["Start time", "Immediately"],
    ["End date & time", mockContract.endDate],
    ["Vesting duration", mockContract.duration],
    ["Release frequency", mockContract.releaseFrequency],
    ["Number of recipients", "1"],
    ["Listed for sale", "No"],
    ["Auto-claim", "Enabled"],
    ["Who can cancel the contract", mockContract.whoCanCancel],
    ["Who can change the recipient", mockContract.whoCanChangeRecipient],
  ];
  return (
    <div className={`grid grid-cols-1 gap-x-10 gap-y-6 ${compact ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="text-sm text-[#fffeea]/50">{label}</div>
          <div className="mt-2 text-sm font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-[#fffeea]/50">{label}</div>
      <div className="mt-1.5 text-sm font-semibold text-white">{children}</div>
    </div>
  );
}

export function ReviewPage() {
  const [successOpen, setSuccessOpen] = useState(false);
  const { saveCreated } = useCreatedContract();

  return (
    <WizardChrome
      step="Review"
      footer={
        <>
          <SecondaryButton href="/create-vesting/recipients">Back</SecondaryButton>
          <PrimaryButton onClick={() => { saveCreated(); setSuccessOpen(true); }}>Create Vesting</PrimaryButton>
        </>
      }
    >
      <section className="mx-auto flex w-full max-w-[536px] flex-col gap-7 py-9">
        <h1 className="text-3xl font-semibold">Review</h1>
        <FieldCard className="flex items-center gap-3 p-3 text-xs text-[#fffeea]/70">
          <span className="text-amber-400">▲</span>
          This contract can be both canceled and transferred.
        </FieldCard>
        <h2 className="text-base font-semibold">Contract details</h2>
        <DetailGrid />
        <hr className="border-[#fffeea]/12" />
        <h2 className="text-base font-semibold">Recipients</h2>
        <FieldCard className="flex h-11 items-center gap-3 px-4 text-sm">
          <TokenIcon size="size-5" />
          <span className="font-semibold">{mockContract.amount}</span>
          <span className="text-[#fffeea]/58">{defaultRecipient.short}</span>
        </FieldCard>
        <hr className="border-[#fffeea]/12" />
        <h2 className="text-base font-semibold">Fees</h2>
        <FieldCard className="flex items-center justify-between p-4 text-sm">
          <span>Fee breakdown</span>
          <ChevronDown size={18} />
        </FieldCard>
      </section>
      {successOpen ? <SuccessModal /> : null}
    </WizardChrome>
  );
}

function SuccessModal() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/64 px-4">
      <div className="w-full max-w-[520px] rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-8 text-center shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#143c22] text-[#47d16c]">
          <Check size={34} />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">Vesting created</h2>
        <p className="mt-3 text-[#fffeea]/62">Your mock vesting contract is ready to review and share.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <SecondaryButton>Share on X</SecondaryButton>
          <SecondaryButton href="/create-vesting/type">Create again</SecondaryButton>
          <PrimaryButton href={`${contractHref()}?new`}>View detail</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function ContractDetailPage() {
  return (
    <AppShell>
      <section className="flex w-full max-w-[842px] flex-col gap-8 pb-10 pt-4">
        <div className="flex flex-col gap-5 rounded-[4px] border border-[#fffeea]/14 bg-[#0b0d11] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[4px] bg-[#f2d467]/14 px-3 py-1 text-xs text-[#f2d467]">Ongoing</span>
                <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#fffeea]/14 px-3 py-1 text-xs text-[#fffeea]/78">
                  <Lock className="text-amber-400" size={13} />
                  Cancelable and transferable
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">{mockContract.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#fffeea]/50">
                <span>4c94E...HMERt</span>
                <Copy className="text-[#fffeea]/55" size={14} />
                <span className="hidden sm:inline">·</span>
                <span>Linear vesting</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <SecondaryButton>Share on X</SecondaryButton>
              <button className="grid size-10 place-items-center rounded-[4px] border border-[#fffeea]/14 bg-[#13151a] text-[#fffeea]/68" type="button">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <FieldCard className="p-4">
              <div className="text-xs text-[#fffeea]/50">Total amount</div>
              <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                <TokenIcon size="size-5" />
                {mockContract.amount}
              </div>
            </FieldCard>
            <FieldCard className="p-4">
              <div className="text-xs text-[#fffeea]/50">Recipient</div>
              <div className="mt-2 text-lg font-semibold">{mockContract.recipientShort}</div>
            </FieldCard>
            <FieldCard className="p-4">
              <div className="text-xs text-[#fffeea]/50">Schedule</div>
              <div className="mt-2 text-lg font-semibold">{mockContract.releaseFrequency}</div>
            </FieldCard>
          </div>
        </div>

        <hr className="border-[#fffeea]/12" />

        <SectionTitle>Contract details</SectionTitle>
        <div className="grid gap-x-10 gap-y-7 md:grid-cols-3">
          <InfoItem label="Vesting type">{mockContract.type}</InfoItem>
          <InfoItem label="Total">
            <span className="inline-flex items-center gap-2">
              <TokenIcon size="size-4" /> {mockContract.amount} <span className="text-xs text-[#fffeea]/42">($0.0009742)</span>
            </span>
          </InfoItem>
          <InfoItem label="Duration">{mockContract.duration}</InfoItem>
          <InfoItem label="Release frequency">{mockContract.releaseFrequency}</InfoItem>
          <InfoItem label="Start time">
            May 22, 2026, <span className="text-[#fffeea]/50">01:36 PM GMT+7</span>
          </InfoItem>
          <InfoItem label="End time">
            May 22, 2027, <span className="text-[#fffeea]/50">01:35 PM GMT+7</span>
          </InfoItem>
        </div>

        <hr className="border-[#fffeea]/12" />

        <SectionTitle>Participants & settings</SectionTitle>
        <div className="grid gap-x-10 gap-y-7 md:grid-cols-3">
          <InfoItem label="Sender">
            {connectedWallet.short} <Copy className="inline text-[#fffeea]/55" size={13} />
          </InfoItem>
          <InfoItem label="Recipient">
            {defaultRecipient.short} <Copy className="inline text-[#fffeea]/55" size={13} />
          </InfoItem>
          <InfoItem label="Token">
            SOL&nbsp;&nbsp; So111...11112 <Copy className="inline text-[#fffeea]/55" size={13} />
          </InfoItem>
          <InfoItem label="Who can cancel">Only Sender</InfoItem>
          <InfoItem label="Who can transfer">Only Sender</InfoItem>
        </div>
      </section>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-white">{children}</h2>;
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
