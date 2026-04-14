import type {
  AccountBalance,
  CreateTransactionInput,
  ParsedDraft,
  PublicSettings,
  SettingsInput,
  SummaryData,
  TransactionRecord,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? '请求失败');
  }

  return payload;
}

export async function getAccounts(): Promise<AccountBalance[]> {
  const payload = await request<{ accounts: AccountBalance[] }>('/accounts');
  return payload.accounts;
}

export async function updateAccountInitialBalance(
  id: number,
  initialBalance: number,
): Promise<void> {
  await request(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ initialBalance }),
  });
}

export async function getSummary(): Promise<SummaryData> {
  return request<SummaryData>('/summary');
}

export async function getSettings(): Promise<PublicSettings> {
  return request<PublicSettings>('/settings');
}

export async function saveSettings(input: SettingsInput): Promise<PublicSettings> {
  return request<PublicSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function loadModels(input: {
  aiEndpointUrl: string;
  aiApiKey?: string;
  aiProtocol?: 'chat_completions' | 'responses';
}): Promise<string[]> {
  const payload = await request<{ models: string[] }>('/settings/models', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.models;
}

export async function createTransaction(input: CreateTransactionInput) {
  return request('/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const payload = await request<{ transactions: TransactionRecord[] }>('/transactions');
  return payload.transactions;
}

export async function deleteTransaction(id: number): Promise<void> {
  await request(`/transactions/${id}`, {
    method: 'DELETE',
  });
}

export async function parseTransaction(input: {
  inputText: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedDraft> {
  const payload = await request<{ draft: ParsedDraft }>('/ai/parse-transaction', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.draft;
}

export async function parseReceiptImage(input: {
  imageDataUrl: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedDraft> {
  const payload = await request<{ draft: ParsedDraft }>('/ai/parse-receipt', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.draft;
}
