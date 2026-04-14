export type Currency = 'CNY' | 'JPY';
export type AccountKind = 'asset' | 'liability';
export type AiProtocol = 'chat_completions' | 'responses';
export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'credit_spending'
  | 'credit_repayment';
export type TransactionOrigin = 'manual' | 'ai';

export interface AccountRecord {
  id: number;
  name: string;
  kind: AccountKind;
  currency: Currency;
  initialBalance: number;
  creditLimit: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  monthlyBillingDay?: number;
  nextMonthRepayment?: number;
  monthAfterNextRepayment?: number;
}

export interface AccountBalance {
  id: number;
  name: string;
  kind: AccountKind;
  currency: Currency;
  balance: number;
  initialBalance: number;
  creditLimit: number;
  monthlyBillingDay?: number;
  nextMonthRepayment?: number;
  monthAfterNextRepayment?: number;
}

export interface SettingsRecord {
  cnyToJpyRate: number;
  jpyToCnyRate: number;
  aiEndpointUrl: string;
  aiApiKey: string;
  aiProtocol: AiProtocol;
  aiModel: string;
}

export interface SummaryResult {
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

export interface TransactionRecord {
  id: number;
  type: TransactionType;
  title: string;
  note: string;
  amount: number;
  currency: Currency;
  sourceAccountId: number | null;
  targetAccountId: number | null;
  sourceAccountName: string;
  targetAccountName: string;
  category: string;
  occurredAt: string;
  createdAt: string;
  deletedAt: string | null;
  origin: TransactionOrigin;
  aiInputText: string;
}

export interface NewTransactionInput {
  type: TransactionType;
  title: string;
  amount: number;
  currency: Currency;
  sourceAccountName?: string;
  targetAccountName?: string;
  note?: string;
  category?: string;
  occurredAt: string;
  origin?: TransactionOrigin;
  aiInputText?: string;
}

export interface AccountEffect {
  accountId: number;
  accountName: string;
  delta: number;
  currency: Currency;
}

export interface ParsedTransactionDraft {
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
