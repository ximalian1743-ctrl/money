import assert from 'node:assert/strict';
import test from 'node:test';

import { computeSummary } from '../src/domain/summary.js';
import type { AccountBalance, SettingsRecord } from '../src/domain/types.js';

const settings: SettingsRecord = {
  cnyToJpyRate: 20,
  jpyToCnyRate: 0.05,
  aiEndpointUrl: '',
  aiApiKey: '',
  aiProtocol: 'chat_completions',
  aiModel: '',
};

test('computeSummary separates assets and liabilities', () => {
  const balances: AccountBalance[] = [
    { id: 1, name: '现金纸币', kind: 'asset', currency: 'CNY', balance: 100, initialBalance: 100 },
    {
      id: 2,
      name: '交通卡西瓜卡',
      kind: 'asset',
      currency: 'JPY',
      balance: 2000,
      initialBalance: 2000,
    },
    {
      id: 3,
      name: 'PayPay 信用卡',
      kind: 'liability',
      currency: 'JPY',
      balance: 5000,
      initialBalance: 5000,
    },
  ];

  const summary = computeSummary(balances, settings);

  assert.equal(summary.totalAssetsCnyBase, 200);
  assert.equal(summary.totalLiabilitiesJpy, 5000);
  assert.equal(summary.actualBalanceCnyBase, -50);
});

test('computeSummary returns per-currency asset totals', () => {
  const balances: AccountBalance[] = [
    { id: 1, name: '微信钱包', kind: 'asset', currency: 'CNY', balance: 300, initialBalance: 300 },
    {
      id: 2,
      name: '交通卡西瓜卡',
      kind: 'asset',
      currency: 'JPY',
      balance: 4000,
      initialBalance: 4000,
    },
  ];

  const summary = computeSummary(balances, settings);

  assert.equal(summary.cnyAssetTotal, 300);
  assert.equal(summary.jpyAssetTotal, 4000);
  assert.equal(summary.assetsInJpy, 10000);
});
