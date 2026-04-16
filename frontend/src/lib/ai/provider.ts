import type { AiProtocol } from '../domain/types';

export function deriveProtocol(endpoint: string): AiProtocol {
  const normalized = endpoint.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/v1/chat/completions')) return 'chat_completions';
  if (normalized.endsWith('/v1/responses')) return 'responses';
  return 'chat_completions';
}

export function normalizeProviderBaseUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('API 地址不能为空');
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const withoutApiPath = withScheme.replace(
    /\/v1(?:\/chat\/completions|\/responses|\/models)?$/,
    '',
  );
  try {
    const parsed = new URL(withoutApiPath);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    throw new Error('API 地址无效');
  }
}

export function buildEndpointUrl(endpoint: string, protocol: AiProtocol): string {
  const baseUrl = normalizeProviderBaseUrl(endpoint);
  return protocol === 'responses' ? `${baseUrl}/v1/responses` : `${baseUrl}/v1/chat/completions`;
}

export function deriveModelsUrl(endpoint: string): string {
  return `${normalizeProviderBaseUrl(endpoint)}/v1/models`;
}

export function extractTextPayload(protocol: AiProtocol, payload: Record<string, unknown>): string {
  if (protocol === 'chat_completions') {
    const choices = payload.choices as Array<Record<string, unknown>> | undefined;
    const message = (choices?.[0]?.message ?? {}) as Record<string, unknown>;
    const content = message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') return item;
          return String((item as Record<string, unknown>).text ?? '');
        })
        .join('\n');
    }
  }

  const outputText = payload.output_text;
  if (typeof outputText === 'string') return outputText;

  const output = payload.output;
  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        const content = (item as Record<string, unknown>).content;
        if (!Array.isArray(content)) return [];
        return content.map((entry) => String((entry as Record<string, unknown>).text ?? ''));
      })
      .join('\n');
  }

  throw new Error('AI 返回内容为空');
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI 未返回有效 JSON');
  }
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    throw new Error('AI JSON 解析失败');
  }
}

export function extractJsonPayload(text: string): unknown {
  // Try array first
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  // If array starts before object, try parsing as array
  if (
    firstBracket !== -1 &&
    lastBracket > firstBracket &&
    (firstBrace === -1 || firstBracket < firstBrace)
  ) {
    try {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1));
    } catch {
      // Fall through to object parsing
    }
  }

  // Parse as single object
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI 未返回有效 JSON');
  }
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new Error('AI JSON 解析失败');
  }
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '*'.repeat(key.length);
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}
