import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.js';

test('GET /api/accounts returns seeded accounts', async () => {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected an address object');
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/api/accounts`);
  const payload = await response.json();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(response.status, 200);
  assert.equal(payload.accounts.length, 7);
  assert.equal(payload.accounts[0]?.name, '邮储银行存折');
});

test('POST /api/settings/models loads provider models from derived base url', async () => {
  const calls: string[] = [];
  const app = createApp({
    fetchImpl: async (input) => {
      calls.push(String(input));
      return Response.json({
        data: [
          { id: 'gpt-4.1-mini' },
          { id: 'gpt-4.1' }
        ]
      });
    }
  });
  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected an address object');
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/api/settings/models`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      aiEndpointUrl: 'https://example.com',
      aiApiKey: 'test-key'
    })
  });
  const payload = await response.json();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(response.status, 200);
  assert.equal(calls[0], 'https://example.com/v1/models');
  assert.deepEqual(payload.models, ['gpt-4.1-mini', 'gpt-4.1']);
});

test('POST /api/ai/parse-transaction returns a normalized draft', async () => {
  const calls: string[] = [];
  const app = createApp({
    fetchImpl: async (input) => {
      calls.push(String(input));
      return Response.json({
        choices: [
          {
            message: {
              content:
                '{"type":"expense","title":"午饭","amount":38,"currency":"CNY","accountName":"现金纸币","targetAccountName":"","category":"餐饮","occurredAt":"2026-04-14T12:00:00.000Z","note":"","warnings":[]}'
            }
          }
        ]
      });
    }
  });
  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected an address object');
  }

  await fetch(`http://127.0.0.1:${address.port}/api/settings`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      aiEndpointUrl: 'https://example.com',
      aiApiKey: 'test-key',
      aiProtocol: 'chat_completions',
      aiModel: 'gpt-4.1-mini',
      cnyToJpyRate: 20,
      jpyToCnyRate: 0.05
    })
  });

  const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/parse-transaction`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      inputText: '午饭38元，用现金纸币'
    })
  });
  const payload = await response.json();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(response.status, 200);
  assert.equal(calls[0], 'https://example.com/v1/chat/completions');
  assert.equal(payload.draft.title, '午饭');
  assert.equal(payload.draft.accountName, '现金纸币');
});

test('POST /api/ai/parse-transaction uses provided fallback time when model omits time', async () => {
  const app = createApp({
    fetchImpl: async () =>
      Response.json({
        choices: [
          {
            message: {
              content:
                '{"type":"expense","title":"咖啡","amount":20,"currency":"CNY","accountName":"现金纸币","targetAccountName":"","category":"餐饮","note":"","warnings":[]}'
            }
          }
        ]
      })
  });
  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected an address object');
  }

  await fetch(`http://127.0.0.1:${address.port}/api/settings`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      aiEndpointUrl: 'https://example.com',
      aiApiKey: 'test-key',
      aiProtocol: 'chat_completions',
      aiModel: 'gpt-4.1-mini',
      cnyToJpyRate: 20,
      jpyToCnyRate: 0.05
    })
  });

  const fallbackOccurredAt = '2026-04-14T09:30:00.000Z';
  const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/parse-transaction`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      inputText: '咖啡20元，用现金纸币',
      fallbackOccurredAt
    })
  });
  const payload = await response.json();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(response.status, 200);
  assert.equal(payload.draft.occurredAt, fallbackOccurredAt);
});
