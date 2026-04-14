import type {
  AccountBalance,
  CreateTransactionInput,
  ParsedDraft,
  PublicSettings,
  SettingsInput,
  SummaryData,
  TransactionRecord as ApiTransactionRecord,
} from '../types/api';
import * as db from './db';
import { computeAccountBalances, computeSummary } from './domain/summary';
import { resolveTransaction } from './domain/transactions';
import type { AccountRecord, SettingsRecord, TransactionRecord } from './domain/types';
import {
  parseReceiptImage as aiParseReceipt,
  parseTransactionText,
  loadModels as aiLoadModels,
} from './ai/client';
import {
  buildEndpointUrl,
  deriveProtocol,
  maskApiKey,
  normalizeProviderBaseUrl,
} from './ai/provider';

async function loadAccountBalances(): Promise<AccountBalance[]> {
  const [accounts, transactions] = await Promise.all([
    db.listAccounts(),
    db.listActiveTransactions(),
  ]);
  const seeded = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    currency: a.currency,
    balance: a.initialBalance,
    initialBalance: a.initialBalance,
    creditLimit: a.creditLimit,
    monthlyBillingDay: a.monthlyBillingDay,
    nextMonthRepayment: a.nextMonthRepayment,
    monthAfterNextRepayment: a.monthAfterNextRepayment,
  }));
  return computeAccountBalances(seeded, transactions);
}

export async function getAccounts(): Promise<AccountBalance[]> {
  return loadAccountBalances();
}

export async function updateAccountInitialBalance(
  id: number,
  initialBalance: number,
): Promise<void> {
  await db.updateAccount(id, { initialBalance });
}

export async function updateAccountDetails(
  id: number,
  patch: Partial<{
    initialBalance: number;
    creditLimit: number;
    monthlyBillingDay: number;
    nextMonthRepayment: number;
    monthAfterNextRepayment: number;
  }>,
): Promise<void> {
  await db.updateAccount(id, patch);
}

export async function getSummary(): Promise<SummaryData> {
  const [balances, settings] = await Promise.all([loadAccountBalances(), db.getSettings()]);
  return computeSummary(balances, settings);
}

function toPublicSettings(record: SettingsRecord): PublicSettings {
  return {
    cnyToJpyRate: record.cnyToJpyRate,
    jpyToCnyRate: record.jpyToCnyRate,
    aiEndpointUrl: record.aiEndpointUrl,
    aiProtocol: record.aiProtocol,
    aiModel: record.aiModel,
    hasApiKey: Boolean(record.aiApiKey),
    aiApiKeyMasked: maskApiKey(record.aiApiKey),
  };
}

export async function getSettings(): Promise<PublicSettings> {
  const record = await db.getSettings();
  return toPublicSettings(record);
}

export async function saveSettings(input: SettingsInput): Promise<PublicSettings> {
  const existing = await db.getSettings();
  const aiProtocol = input.aiProtocol ?? deriveProtocol(input.aiEndpointUrl);
  const normalizedEndpoint = input.aiEndpointUrl
    ? buildEndpointUrl(input.aiEndpointUrl, aiProtocol)
    : '';
  const next: SettingsRecord = {
    cnyToJpyRate: input.cnyToJpyRate,
    jpyToCnyRate: input.jpyToCnyRate,
    aiEndpointUrl: normalizedEndpoint,
    aiApiKey: input.aiApiKey || existing.aiApiKey,
    aiProtocol,
    aiModel: input.aiModel,
  };
  const saved = await db.saveSettings(next);
  return toPublicSettings(saved);
}

export async function loadModels(input: {
  aiEndpointUrl: string;
  aiApiKey?: string;
  aiProtocol?: 'chat_completions' | 'responses';
}): Promise<string[]> {
  const existing = await db.getSettings();
  const aiEndpointUrl = input.aiEndpointUrl || existing.aiEndpointUrl;
  const aiApiKey = input.aiApiKey || existing.aiApiKey;
  if (!aiEndpointUrl || !aiApiKey) {
    throw new Error('请先填写 API 地址和 Key');
  }
  const baseUrl = normalizeProviderBaseUrl(aiEndpointUrl);
  return aiLoadModels({ aiEndpointUrl: baseUrl, aiApiKey });
}

function resolveName(accounts: AccountRecord[], id: number | null): string {
  if (id === null) return '';
  return accounts.find((a) => a.id === id)?.name ?? '';
}

function toApiTransaction(record: TransactionRecord): ApiTransactionRecord {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    note: record.note,
    amount: record.amount,
    currency: record.currency,
    sourceAccountName: record.sourceAccountName,
    targetAccountName: record.targetAccountName,
    category: record.category,
    occurredAt: record.occurredAt,
  };
}

export async function createTransaction(input: CreateTransactionInput): Promise<void> {
  const accounts = await db.listAccounts();
  const resolved = resolveTransaction(
    {
      type: input.type,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      sourceAccountName: input.sourceAccountName,
      targetAccountName: input.targetAccountName,
      note: input.note,
      category: input.category,
      occurredAt: input.occurredAt,
      origin: input.origin,
      aiInputText: input.aiInputText,
    },
    accounts,
  );

  await db.createTransaction({
    type: input.type,
    title: input.title,
    note: input.note ?? '',
    amount: input.amount,
    currency: input.currency,
    sourceAccountId: resolved.sourceAccountId,
    targetAccountId: resolved.targetAccountId,
    sourceAccountName: resolveName(accounts, resolved.sourceAccountId),
    targetAccountName: resolveName(accounts, resolved.targetAccountId),
    category: input.category ?? '',
    occurredAt: input.occurredAt,
    origin: input.origin ?? 'manual',
    aiInputText: input.aiInputText ?? '',
  });
}

export async function getTransactions(): Promise<ApiTransactionRecord[]> {
  const records = await db.listActiveTransactions();
  return records.map(toApiTransaction);
}

export async function deleteTransaction(id: number): Promise<void> {
  const ok = await db.softDeleteTransaction(id);
  if (!ok) throw new Error('找不到该流水记录');
}

export async function parseTransaction(input: {
  inputText: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedDraft> {
  const [settings, accounts] = await Promise.all([db.getSettings(), db.listAccounts()]);
  return parseTransactionText({
    settings,
    accounts,
    inputText: input.inputText,
    fallbackOccurredAt: input.fallbackOccurredAt,
  });
}

export async function parseReceiptImage(input: {
  imageDataUrl: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedDraft> {
  const [settings, accounts] = await Promise.all([db.getSettings(), db.listAccounts()]);
  return aiParseReceipt({
    settings,
    accounts,
    imageDataUrl: input.imageDataUrl,
    fallbackOccurredAt: input.fallbackOccurredAt,
  });
}

export { exportAll, importAll, resetDb } from './db';
export type { BackupPayload } from './db';
