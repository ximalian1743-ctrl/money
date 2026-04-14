import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEndpointUrl,
  deriveModelsUrl,
  deriveProtocol,
  extractJsonObject,
  extractTextPayload
} from '../src/lib/provider.js';

test('deriveModelsUrl strips chat completions path', () => {
  assert.equal(
    deriveModelsUrl('https://example.com/v1/chat/completions'),
    'https://example.com/v1/models'
  );
});

test('deriveModelsUrl appends models path for provider base url', () => {
  assert.equal(
    deriveModelsUrl('https://example.com'),
    'https://example.com/v1/models'
  );
});

test('deriveProtocol detects responses endpoint', () => {
  assert.equal(
    deriveProtocol('https://example.com/v1/responses'),
    'responses'
  );
});

test('deriveProtocol defaults to chat completions for provider base url', () => {
  assert.equal(
    deriveProtocol('https://example.com'),
    'chat_completions'
  );
});

test('buildEndpointUrl composes chat completions url from provider base', () => {
  assert.equal(
    buildEndpointUrl('https://example.com', 'chat_completions'),
    'https://example.com/v1/chat/completions'
  );
});

test('buildEndpointUrl switches full endpoint to selected protocol', () => {
  assert.equal(
    buildEndpointUrl('https://example.com/v1/chat/completions', 'responses'),
    'https://example.com/v1/responses'
  );
});

test('extractTextPayload supports chat completion responses', () => {
  const text = extractTextPayload('chat_completions', {
    choices: [{ message: { content: '{"type":"expense"}' } }]
  });

  assert.equal(text, '{"type":"expense"}');
});

test('extractJsonObject finds the first valid JSON object in mixed text', () => {
  assert.deepEqual(
    extractJsonObject('结果如下:\n{"type":"expense","amount":38}\n谢谢'),
    { type: 'expense', amount: 38 }
  );
});
