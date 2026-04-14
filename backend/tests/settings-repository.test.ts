import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryDatabase } from '../src/db/database.js';
import { SettingsRepository } from '../src/repositories/settings-repository.js';

test('get returns seeded defaults', () => {
  const db = createMemoryDatabase();
  const repo = new SettingsRepository(db);

  const settings = repo.get();
  assert.equal(settings.cnyToJpyRate, 20);
  assert.equal(settings.jpyToCnyRate, 0.05);
  assert.equal(settings.aiEndpointUrl, '');
  assert.equal(settings.aiProtocol, 'chat_completions');
});

test('update writes all fields and can be read back', () => {
  const db = createMemoryDatabase();
  const repo = new SettingsRepository(db);

  const updated = repo.update({
    cnyToJpyRate: 21,
    jpyToCnyRate: 0.048,
    aiEndpointUrl: 'https://api.example.com/v1/chat/completions',
    aiApiKey: 'sk-test',
    aiProtocol: 'responses',
    aiModel: 'gpt-4.1',
  });

  assert.equal(updated.cnyToJpyRate, 21);
  assert.equal(updated.aiApiKey, 'sk-test');
  assert.equal(updated.aiProtocol, 'responses');

  const reread = repo.get();
  assert.deepEqual(reread, updated);
});
