export type Currency = 'CNY' | 'JPY';
export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'credit_spending'
  | 'credit_repayment';

export interface AccountBalance {
  id: number;
  name: string;
  kind: 'asset' | 'liability';
  currency: Currency;
  balance: number;
  initialBalance: number;
  creditLimit: number;
  monthlyBillingDay?: number;
  paymentDueDay?: number;
  nextMonthRepayment?: number;
  monthAfterNextRepayment?: number;
}

export interface SummaryData {
  balances: AccountBalance[];
  cnyAssetTotal: number;
  jpyAssetTotal: number;
  assetsInCny: number;
  assetsInJpy: number;
  totalAssetsCnyBase: number;
  totalLiabilitiesJpy: number;
  totalLiabilitiesCnyBase: number;
  actualBalanceCnyBase: number;
}

export interface PublicSettings {
  cnyToJpyRate: number;
  jpyToCnyRate: number;
  aiEndpointUrl: string;
  aiProtocol: 'chat_completions' | 'responses';
  aiModel: string;
  hasApiKey: boolean;
  aiApiKeyMasked: string;
}

export interface SettingsInput {
  cnyToJpyRate: number;
  jpyToCnyRate: number;
  aiEndpointUrl: string;
  aiApiKey: string;
  aiProtocol: 'chat_completions' | 'responses';
  aiModel: string;
}

export interface TransactionRecord {
  id: number;
  type: TransactionType;
  title: string;
  note: string;
  amount: number;
  currency: Currency;
  sourceAccountName: string;
  targetAccountName: string;
  category: string;
  occurredAt: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  title: string;
  note?: string;
  amount: number;
  currency: Currency;
  sourceAccountName?: string;
  targetAccountName?: string;
  category?: string;
  occurredAt: string;
  origin?: 'manual' | 'ai';
  aiInputText?: string;
}

export interface ParsedDraft {
  type: TransactionType;
  title: string;
  amount: number;
  currency: Currency;
  accountName: string;
  targetAccountName: string;
  category: string;
  occurredAt: string;
  note: string;
  warnings: string[];
}
