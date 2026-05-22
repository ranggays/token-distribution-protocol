export type VestingContract = {
  id: string;
  title: string;
  amount: string;
  amountUsd: string;
  token: string;
  tokenAddress: string;
  recipient: string;
  recipientShort: string;
  sender: string;
  senderShort: string;
  status: "Ongoing" | "Scheduled" | "Completed" | "Canceled";
  type: "Linear" | "Price-based";
  transaction: "Outgoing" | "Incoming";
  startDate: string;
  endDate: string;
  duration: string;
  releaseFrequency: string;
  unlockPerPeriod: string;
  nextUnlock: string;
  autoClaim: boolean;
  listedForSale: boolean;
  whoCanCancel: string;
  whoCanChangeRecipient: string;
};

export const connectedWallet = {
  full: "E9LtaWGBUU4SFyRH6UG1jp7BBLes3BNAtu8bB8p15Eir",
  short: "E9Lta...15Eir",
};

export const defaultRecipient = {
  full: "5RtpuuXAqF7E3bLPmNJ5XwvQEnAjNUakR7ib9hT7VgAT",
  short: "5Rtpu...7VgAT",
  email: "hello@example.com",
};

export const mockContract: VestingContract = {
  id: "4c94ETwHsPnNQk1CQTfuKsHNfvMA6TDa2qZ7En1HMERt",
  title: "Testing",
  amount: "0.5 SOL",
  amountUsd: "$0.00054",
  token: "SOL",
  tokenAddress: "So11111111111111111111111111111111111111112",
  recipient: defaultRecipient.full,
  recipientShort: defaultRecipient.short,
  sender: connectedWallet.full,
  senderShort: connectedWallet.short,
  status: "Ongoing",
  type: "Linear",
  transaction: "Outgoing",
  startDate: "May 22, 2026 at 1:36 PM",
  endDate: "May 22, 2027, 1:35 PM",
  duration: "12 months",
  releaseFrequency: "Monthly",
  unlockPerPeriod: "0.04167 SOL",
  nextUnlock: "Jun 21, 2026, 11:36 PM GMT+7",
  autoClaim: true,
  listedForSale: false,
  whoCanCancel: "Only Sender",
  whoCanChangeRecipient: "Only Sender",
};

export const storageKey = "velora-prototype-contract-created";

export function contractHref(contract = mockContract) {
  return `/contract/solana/devnet/${contract.id}`;
}
