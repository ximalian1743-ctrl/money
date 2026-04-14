import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeParsedDraft } from '../src/domain/ai.js';
import type { AccountRecord } from '../src/domain/types.js';

const accounts: AccountRecord[] = [
  {
    id: 1,
    name: '中国银行储蓄卡',
    kind: 'asset',
    currency: 'CNY',
    initialBalance: 0,
    creditLimit: 0,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'PayPay 信用卡',
    kind: 'liability',
    currency: 'JPY',
    initialBalance: 0,
    creditLimit: 100000,
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

test('income with account in accountName falls back to targetAccountName', () => {
  const draft = normalizeParsedDraft(
    {
      type: 'income',
      title: '设置初始金额',
      amount: 711.44,
      currency: 'CNY',
      accountName: '中国银行储蓄卡',
      targetAccountName: '',
    },
    '中国银行储蓄卡设置初始金额为711.44元',
    accounts,
  );

  assert.equal(draft.targetAccountName, '中国银行储蓄卡');
  assert.equal(draft.accountName, '');
});

test('credit_spending with account in accountName falls back to targetAccountName', () => {
  const draft = normalizeParsedDraft(
    {
      type: 'credit_spending',
      title: '便利店消费',
      amount: 500,
      currency: 'JPY',
      accountName: 'PayPay 信用卡',
      targetAccountName: '',
    },
    '便利店 PayPay 500 日元',
    accounts,
  );

  assert.equal(draft.targetAccountName, 'PayPay 信用卡');
  assert.equal(draft.accountName, '');
});

test('expense with account in targetAccountName falls back to accountName', () => {
  const draft = normalizeParsedDraft(
    {
      type: 'expense',
      title: '午饭',
      amount: 38,
      currency: 'CNY',
      accountName: '',
      targetAccountName: '中国银行储蓄卡',
    },
    '午饭 38 元',
    accounts,
  );

  assert.equal(draft.accountName, '中国银行储蓄卡');
  assert.equal(draft.targetAccountName, '');
});

test('expense keeps accountName when already set', () => {
  const draft = normalizeParsedDraft(
    {
      type: 'expense',
      title: '午饭',
      amount: 38,
      currency: 'CNY',
      accountName: '中国银行储蓄卡',
      targetAccountName: '',
    },
    '午饭 38 元',
    accounts,
  );

  assert.equal(draft.accountName, '中国银行储蓄卡');
  assert.equal(draft.targetAccountName, '');
});
