import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryDatabase } from '../src/db/database.js';
import { TransactionService } from '../src/services/transaction-service.js';

test('expense decreases an asset account balance', () => {
  const db = createMemoryDatabase();
  const service = new TransactionService(db);

  const result = service.create({
    type: 'expense',
    title: '午饭',
    amount: 38,
    currency: 'CNY',
    sourceAccountName: '现金纸币',
    occurredAt: '2026-04-14T12:00:00.000Z',
  });

  assert.equal(result.accountEffects[0]?.delta, -38);
});

test('credit repayment decreases liability and funding account together', () => {
  const db = createMemoryDatabase();
  const service = new TransactionService(db);

  service.create({
    type: 'credit_spending',
    title: '便利店',
    amount: 1200,
    currency: 'JPY',
    targetAccountName: 'PayPay 信用卡',
    occurredAt: '2026-04-14T12:00:00.000Z',
  });

  const result = service.create({
    type: 'credit_repayment',
    title: '还款',
    amount: 1200,
    currency: 'JPY',
    sourceAccountName: '交通卡西瓜卡',
    targetAccountName: 'PayPay 信用卡',
    occurredAt: '2026-04-14T13:00:00.000Z',
  });

  assert.deepEqual(
    result.accountEffects.map((item) => item.delta),
    [-1200, -1200],
  );
});
