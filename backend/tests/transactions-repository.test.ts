import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryDatabase } from '../src/db/database.js';
import { AccountsRepository } from '../src/repositories/accounts-repository.js';
import { TransactionsRepository } from '../src/repositories/transactions-repository.js';

function makeRepo() {
  const db = createMemoryDatabase();
  const accounts = new AccountsRepository(db);
  const cash = accounts.getByName('现金纸币');
  if (!cash) throw new Error('seed account missing');
  return { db, repo: new TransactionsRepository(db), cashId: cash.id };
}

test('create persists an expense and resolves the source account name', () => {
  const { repo, cashId } = makeRepo();

  const record = repo.create({
    type: 'expense',
    title: '午饭',
    amount: 38,
    currency: 'CNY',
    sourceAccountId: cashId,
    targetAccountId: null,
    category: '餐饮',
    occurredAt: '2026-04-14T12:00:00.000Z',
    origin: 'manual',
    note: '',
    aiInputText: '',
  });

  assert.equal(record.type, 'expense');
  assert.equal(record.title, '午饭');
  assert.equal(record.sourceAccountName, '现金纸币');
  assert.equal(record.targetAccountName, '');
  assert.equal(record.deletedAt, null);
});

test('listActive excludes soft-deleted rows and orders by occurredAt desc', () => {
  const { repo, cashId } = makeRepo();

  const older = repo.create({
    type: 'expense',
    title: '早',
    amount: 5,
    currency: 'CNY',
    sourceAccountId: cashId,
    targetAccountId: null,
    category: '',
    occurredAt: '2026-04-13T10:00:00.000Z',
    origin: 'manual',
    note: '',
    aiInputText: '',
  });
  const newer = repo.create({
    type: 'expense',
    title: '晚',
    amount: 25,
    currency: 'CNY',
    sourceAccountId: cashId,
    targetAccountId: null,
    category: '',
    occurredAt: '2026-04-14T20:00:00.000Z',
    origin: 'manual',
    note: '',
    aiInputText: '',
  });

  assert.equal(repo.softDelete(older.id), true);

  const active = repo.listActive();
  assert.equal(active.length, 1);
  assert.equal(active[0].id, newer.id);
});

test('softDelete returns false when the row was already deleted', () => {
  const { repo, cashId } = makeRepo();

  const record = repo.create({
    type: 'expense',
    title: '咖啡',
    amount: 20,
    currency: 'CNY',
    sourceAccountId: cashId,
    targetAccountId: null,
    category: '',
    occurredAt: '2026-04-14T09:00:00.000Z',
    origin: 'manual',
    note: '',
    aiInputText: '',
  });

  assert.equal(repo.softDelete(record.id), true);
  assert.equal(repo.softDelete(record.id), false);
  assert.equal(repo.softDelete(9999), false);
});
