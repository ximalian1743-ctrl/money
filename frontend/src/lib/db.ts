import { openDB, type IDBPDatabase } from 'idb';

import type { AccountRecord, SettingsRecord, TransactionRecord } from './domain/types';

const DB_NAME = 'money-record';
const DB_VERSION = 1;

const DEFAULT_ACCOUNTS: ReadonlyArray<Omit<AccountRecord, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: '邮储银行存折',
    kind: 'asset',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: '现金纸币',
    kind: 'asset',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: '现金硬币',
    kind: 'asset',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: '中国银行储蓄卡',
    kind: 'asset',
    currency: 'CNY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: '微信钱包',
    kind: 'asset',
    currency: 'CNY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: '交通卡西瓜卡',
    kind: 'asset',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: 'PayPay 电子钱包',
    kind: 'asset',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
  },
  {
    name: 'PayPay 信用卡',
    kind: 'liability',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 100000,
    isSystem: true,
    isActive: true,
  },
];

export const DEFAULT_AI_ENDPOINT = 'https://api.ximalian.cc.cd/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'claude-sonnet-4-6';

export const DEFAULT_SETTINGS: SettingsRecord = {
  cnyToJpyRate: 20,
  jpyToCnyRate: 0.05,
  aiEndpointUrl: DEFAULT_AI_ENDPOINT,
  aiApiKey: '',
  aiProtocol: 'chat_completions',
  aiModel: DEFAULT_AI_MODEL,
};

interface MoneyDbSchema {
  accounts: AccountRecord;
  transactions: TransactionRecord;
  settings: SettingsRecord & { id: 'singleton' };
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts')) {
          const store = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
          store.createIndex('name', 'name', { unique: true });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('occurredAt', 'occurredAt');
          store.createIndex('deletedAt', 'deletedAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    }).then(async (db) => {
      await seedIfEmpty(db);
      return db;
    });
  }
  return dbPromise;
}

async function seedIfEmpty(db: IDBPDatabase): Promise<void> {
  const accountCount = await db.count('accounts');
  if (accountCount === 0) {
    const now = new Date().toISOString();
    const tx = db.transaction('accounts', 'readwrite');
    for (const account of DEFAULT_ACCOUNTS) {
      await tx.store.add({ ...account, createdAt: now, updatedAt: now });
    }
    await tx.done;
  } else {
    await migrateAccounts(db);
  }

  const existingSettings = await db.get('settings', 'singleton');
  if (!existingSettings) {
    await db.put('settings', { id: 'singleton', ...DEFAULT_SETTINGS });
  }
}

// 迁移现有账户数据：更新货币设置、补充新账户
// 该函数幂等，每次打开数据库时运行
export async function migrateAccounts(db: IDBPDatabase): Promise<void> {
  const now = new Date().toISOString();
  const allAccounts = (await db.getAll('accounts')) as AccountRecord[];

  const tx = db.transaction('accounts', 'readwrite');

  // 将邮储银行存折/现金纸币/现金硬币从人民币改为日元
  const jpyAccountNames = ['邮储银行存折', '现金纸币', '现金硬币'];
  for (const account of allAccounts) {
    if (jpyAccountNames.includes(account.name) && account.currency === 'CNY') {
      await tx.store.put({ ...account, currency: 'JPY', updatedAt: now });
    }
  }

  // 添加 PayPay 电子钱包（如不存在）
  const hasWallet = allAccounts.some((a) => a.name === 'PayPay 电子钱包');
  if (!hasWallet) {
    await tx.store.add({
      name: 'PayPay 电子钱包',
      kind: 'asset',
      currency: 'JPY',
      initialBalance: 0,
      creditLimit: 0,
      isSystem: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await tx.done;
}

export async function listAccounts(): Promise<AccountRecord[]> {
  const db = await getDb();
  const all = (await db.getAll('accounts')) as AccountRecord[];
  return all.filter((account) => account.isActive).sort((a, b) => a.id - b.id);
}

export async function updateAccount(
  id: number,
  patch: Partial<Omit<AccountRecord, 'id' | 'createdAt'>>,
): Promise<AccountRecord> {
  const db = await getDb();
  const existing = (await db.get('accounts', id)) as AccountRecord | undefined;
  if (!existing) {
    throw new Error('账户不存在');
  }
  const updated: AccountRecord = {
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  await db.put('accounts', updated);
  return updated;
}

export async function listActiveTransactions(): Promise<TransactionRecord[]> {
  const db = await getDb();
  const all = (await db.getAll('transactions')) as TransactionRecord[];
  return all
    .filter((t) => !t.deletedAt)
    .sort((a, b) => {
      const aTime = new Date(a.occurredAt).getTime();
      const bTime = new Date(b.occurredAt).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return b.id - a.id;
    });
}

export async function createTransaction(
  input: Omit<TransactionRecord, 'id' | 'createdAt' | 'deletedAt'>,
): Promise<TransactionRecord> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = (await db.add('transactions', {
    ...input,
    createdAt: now,
    deletedAt: null,
  })) as number;
  return { ...input, id, createdAt: now, deletedAt: null };
}

export async function updateTransaction(
  id: number,
  patch: Partial<Omit<TransactionRecord, 'id' | 'createdAt' | 'deletedAt'>>,
): Promise<TransactionRecord> {
  const db = await getDb();
  const existing = (await db.get('transactions', id)) as TransactionRecord | undefined;
  if (!existing || existing.deletedAt) {
    throw new Error('找不到该流水记录');
  }
  const updated: TransactionRecord = { ...existing, ...patch };
  await db.put('transactions', updated);
  return updated;
}

export async function softDeleteTransaction(id: number): Promise<boolean> {
  const db = await getDb();
  const existing = (await db.get('transactions', id)) as TransactionRecord | undefined;
  if (!existing || existing.deletedAt) return false;
  await db.put('transactions', { ...existing, deletedAt: new Date().toISOString() });
  return true;
}

export async function getSettings(): Promise<SettingsRecord> {
  const db = await getDb();
  const record = (await db.get('settings', 'singleton')) as
    | (SettingsRecord & { id: 'singleton' })
    | undefined;
  if (!record) return DEFAULT_SETTINGS;
  const { id: _id, ...rest } = record;
  void _id;
  if (!rest.aiModel) rest.aiModel = DEFAULT_AI_MODEL;
  if (!rest.aiEndpointUrl) rest.aiEndpointUrl = DEFAULT_AI_ENDPOINT;
  return rest;
}

export async function saveSettings(next: SettingsRecord): Promise<SettingsRecord> {
  const db = await getDb();
  await db.put('settings', { id: 'singleton', ...next });
  return next;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  settings: SettingsRecord;
}

export async function exportAll(): Promise<BackupPayload> {
  const db = await getDb();
  const [accounts, transactions, settings] = await Promise.all([
    db.getAll('accounts') as Promise<AccountRecord[]>,
    db.getAll('transactions') as Promise<TransactionRecord[]>,
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    settings,
  };
}

export async function importAll(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error('备份版本不兼容');
  }
  const db = await getDb();
  const tx = db.transaction(['accounts', 'transactions', 'settings'], 'readwrite');
  await tx.objectStore('accounts').clear();
  await tx.objectStore('transactions').clear();
  await tx.objectStore('settings').clear();
  for (const account of payload.accounts) {
    await tx.objectStore('accounts').add(account);
  }
  for (const transaction of payload.transactions) {
    await tx.objectStore('transactions').add(transaction);
  }
  await tx.objectStore('settings').put({ id: 'singleton', ...payload.settings });
  await tx.done;
  // 旧版备份导入后运行迁移，补全货币变更和新账户
  await migrateAccounts(db);
}

export async function resetDb(): Promise<void> {
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

export type { MoneyDbSchema };
