import type { DatabaseSync } from 'node:sqlite';

import type { SeedAccount } from '../domain/types.js';

const DEFAULT_ACCOUNTS: SeedAccount[] = [
  { name: '邮储银行存折', kind: 'asset', currency: 'CNY' },
  { name: '现金纸币', kind: 'asset', currency: 'CNY' },
  { name: '现金硬币', kind: 'asset', currency: 'CNY' },
  { name: '中国银行储蓄卡', kind: 'asset', currency: 'CNY' },
  { name: '微信钱包', kind: 'asset', currency: 'CNY' },
  { name: '交通卡西瓜卡', kind: 'asset', currency: 'JPY' },
  { name: 'PayPay 信用卡', kind: 'liability', currency: 'JPY', creditLimit: 100000 }
];

export function seedDefaults(db: DatabaseSync): void {
  const insertAccount = db.prepare(`
    insert into accounts (
      name, kind, currency, initial_balance, credit_limit, is_system, is_active, created_at, updated_at
    ) values (?, ?, ?, ?, ?, 1, 1, ?, ?)
    on conflict(name) do nothing
  `);
  const now = new Date().toISOString();

  for (const account of DEFAULT_ACCOUNTS) {
    insertAccount.run(
      account.name,
      account.kind,
      account.currency,
      account.initialBalance ?? 0,
      account.creditLimit ?? 0,
      now,
      now
    );
  }

  db.prepare(`
    insert into settings (
      id, cny_to_jpy_rate, jpy_to_cny_rate, ai_endpoint_url, ai_api_key, ai_protocol, ai_model, updated_at
    ) values (1, 20, 0.05, '', '', 'chat_completions', '', ?)
    on conflict(id) do nothing
  `).run(now);
}
