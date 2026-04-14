import { z } from 'zod';

import type { AccountRecord, ParsedTransactionDraft } from './types';

const draftSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer', 'credit_spending', 'credit_repayment']),
  title: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  currency: z.enum(['CNY', 'JPY']),
  accountName: z.string().trim().default(''),
  targetAccountName: z.string().trim().default(''),
  category: z.string().trim().default(''),
  occurredAt: z.string().trim().default(''),
  note: z.string().trim().default(''),
  warnings: z.array(z.string()).default([]),
});

function normalizeCurrency(value: unknown): 'CNY' | 'JPY' {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  if (text === 'JPY' || text === '日元' || text === '円') return 'JPY';
  return 'CNY';
}

function normalizeAccountName(
  rawValue: unknown,
  accounts: readonly AccountRecord[],
  warnings: string[],
): string {
  const value = String(rawValue ?? '').trim();
  if (!value) return '';
  const match = accounts.find((account) => account.name === value);
  if (!match) {
    warnings.push(`未知账户已保留为空: ${value}`);
    return '';
  }
  return match.name;
}

export function normalizeParsedDraft(
  rawDraft: unknown,
  inputText: string,
  accounts: readonly AccountRecord[],
  fallbackOccurredAt?: string,
): ParsedTransactionDraft {
  const record =
    typeof rawDraft === 'object' && rawDraft ? (rawDraft as Record<string, unknown>) : {};

  const rawWarnings = record.warnings;
  const warnings = Array.isArray(rawWarnings)
    ? rawWarnings.map((item) => String(item))
    : typeof rawWarnings === 'string' && rawWarnings.trim()
      ? [rawWarnings]
      : [];

  const now = new Date().toISOString();
  const occurredAtRaw = String(record.occurredAt ?? record.occurred_at ?? '').trim();
  const fallbackOccurredAtValue =
    fallbackOccurredAt && !Number.isNaN(Date.parse(fallbackOccurredAt))
      ? new Date(fallbackOccurredAt).toISOString()
      : '';
  const occurredAt =
    occurredAtRaw && !Number.isNaN(Date.parse(occurredAtRaw))
      ? new Date(occurredAtRaw).toISOString()
      : fallbackOccurredAtValue || now;

  if (!occurredAtRaw) {
    warnings.push(
      fallbackOccurredAtValue ? '未提供时间，已使用传入的基准时间' : '未提供时间，已使用当前时间',
    );
  }

  const draft = draftSchema.parse({
    type: record.type,
    title: String(record.title ?? inputText.slice(0, 24)).trim() || inputText.slice(0, 24),
    amount: record.amount,
    currency: normalizeCurrency(record.currency),
    accountName: normalizeAccountName(
      record.accountName ?? record.account_name,
      accounts,
      warnings,
    ),
    targetAccountName: normalizeAccountName(
      record.targetAccountName ?? record.target_account_name,
      accounts,
      warnings,
    ),
    category: record.category ?? '',
    occurredAt,
    note: record.note ?? '',
    warnings,
  });

  return applyAccountFieldFallback(draft);
}

function applyAccountFieldFallback(draft: ParsedTransactionDraft): ParsedTransactionDraft {
  switch (draft.type) {
    case 'income':
    case 'credit_spending':
      if (!draft.targetAccountName && draft.accountName) {
        return { ...draft, targetAccountName: draft.accountName, accountName: '' };
      }
      return draft;
    case 'expense':
      if (!draft.accountName && draft.targetAccountName) {
        return { ...draft, accountName: draft.targetAccountName, targetAccountName: '' };
      }
      return draft;
    default:
      return draft;
  }
}
