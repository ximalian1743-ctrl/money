import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryDatabase } from '../src/db/database.js';
import { AccountsRepository } from '../src/repositories/accounts-repository.js';

test('list returns only active accounts ordered by id', () => {
  const db = createMemoryDatabase();
  const repo = new AccountsRepository(db);

  db.prepare('update accounts set is_active = 0 where name = ?').run('邮储银行存折');

  const accounts = repo.list();

  assert.ok(accounts.length > 0);
  assert.ok(accounts.every((account) => account.isActive));
  assert.ok(!accounts.some((account) => account.name === '邮储银行存折'));
  for (let i = 1; i < accounts.length; i += 1) {
    assert.ok(accounts[i].id > accounts[i - 1].id);
  }
});

test('getByName returns the matching account or null', () => {
  const db = createMemoryDatabase();
  const repo = new AccountsRepository(db);

  const found = repo.getByName('现金纸币');
  assert.ok(found);
  assert.equal(found.name, '现金纸币');

  assert.equal(repo.getByName('does-not-exist'), null);
});

test('updateInitialBalance persists the new balance and bumps updatedAt', () => {
  const db = createMemoryDatabase();
  const repo = new AccountsRepository(db);

  const before = repo.getByName('现金纸币');
  assert.ok(before);

  const updated = repo.updateInitialBalance(before.id, 123.45);

  assert.ok(updated);
  assert.equal(updated.initialBalance, 123.45);
  assert.ok(updated.updatedAt >= before.updatedAt);

  const reread = repo.getByName('现金纸币');
  assert.equal(reread?.initialBalance, 123.45);
});

test('updateInitialBalance returns null for an unknown account id', () => {
  const db = createMemoryDatabase();
  const repo = new AccountsRepository(db);

  assert.equal(repo.updateInitialBalance(9999, 10), null);
});
