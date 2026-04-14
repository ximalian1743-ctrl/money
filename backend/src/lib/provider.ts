import { HttpError } from './http-error.js';

export type FetchLike = typeof fetch;

export function deriveProtocol(endpoint: string): 'chat_completions' | 'responses' {
  const normalized = endpoint.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/v1/chat/completions')) {
    return 'chat_completions';
  }
  if (normalized.endsWith('/v1/responses')) {
    return 'responses';
  }
  return 'chat_completions';
}

export function normalizeProviderBaseUrl(endpoint: string): string {
  const normalized = endpoint.trim().replace(/\/+$/, '');

  if (!normalized) {
    throw new HttpError(400, 'API 地址不能为空');
  }

  return normalized.replace(/\/v1(?:\/chat\/completions|\/responses|\/models)?$/, '');
}

export function buildEndpointUrl(
  endpoint: string,
  protocol: 'chat_completions' | 'responses',
): string {
  const baseUrl = normalizeProviderBaseUrl(endpoint);
  return protocol === 'responses' ? `${baseUrl}/v1/responses` : `${baseUrl}/v1/chat/completions`;
}

export function deriveModelsUrl(endpoint: string): string {
  return `${normalizeProviderBaseUrl(endpoint)}/v1/models`;
}

export function extractTextPayload(
  protocol: 'chat_completions' | 'responses',
  payload: Record<string, unknown>,
): string {
  if (protocol === 'chat_completions') {
    const message = ((payload.choices as Array<Record<string, unknown>> | undefined)?.[0]
      ?.message ?? {}) as Record<string, unknown>;
    const content = message.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          return String((item as Record<string, unknown>).text ?? '');
        })
        .join('\n');
    }
  }

  const outputText = payload.output_text;
  if (typeof outputText === 'string') {
    return outputText;
  }

  const output = payload.output;
  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        const content = (item as Record<string, unknown>).content;
        if (!Array.isArray(content)) {
          return [];
        }
        return content.map((entry) => String((entry as Record<string, unknown>).text ?? ''));
      })
      .join('\n');
  }

  throw new HttpError(502, 'AI 返回内容为空');
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new HttpError(502, 'AI 未返回有效 JSON');
  }

  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    throw new HttpError(502, 'AI JSON 解析失败');
  }
}

export function maskApiKey(key: string): string {
  if (!key) {
    return '';
  }
  if (key.length <= 8) {
    return '*'.repeat(key.length);
  }
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}
