import { z } from 'zod';

import type { SettingsRecord } from '../domain/types.js';
import { HttpError } from '../lib/http-error.js';
import type { FetchLike } from '../lib/provider.js';
import { buildEndpointUrl, deriveModelsUrl, deriveProtocol, maskApiKey } from '../lib/provider.js';
import type { SettingsRepository } from '../repositories/settings-repository.js';

const settingsSchema = z.object({
  cnyToJpyRate: z.number().positive(),
  jpyToCnyRate: z.number().positive(),
  aiEndpointUrl: z.string().trim(),
  aiApiKey: z.string().trim(),
  aiProtocol: z.enum(['chat_completions', 'responses']).optional(),
  aiModel: z.string().trim(),
});

const transientSettingsSchema = z.object({
  aiEndpointUrl: z.string().trim(),
  aiApiKey: z.string().trim().optional(),
  aiProtocol: z.enum(['chat_completions', 'responses']).optional(),
});

export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  getPublicSettings() {
    const settings = this.settingsRepository.get();
    return {
      cnyToJpyRate: settings.cnyToJpyRate,
      jpyToCnyRate: settings.jpyToCnyRate,
      aiEndpointUrl: settings.aiEndpointUrl,
      aiProtocol: settings.aiProtocol,
      aiModel: settings.aiModel,
      hasApiKey: Boolean(settings.aiApiKey),
      aiApiKeyMasked: maskApiKey(settings.aiApiKey),
    };
  }

  update(input: unknown) {
    const existing = this.settingsRepository.get();
    const parsed = settingsSchema.parse(input);
    const aiProtocol = parsed.aiProtocol ?? deriveProtocol(parsed.aiEndpointUrl);
    const nextSettings: SettingsRecord = {
      ...parsed,
      aiEndpointUrl: buildEndpointUrl(parsed.aiEndpointUrl, aiProtocol),
      aiProtocol,
      aiApiKey: parsed.aiApiKey || existing.aiApiKey,
    };

    const saved = this.settingsRepository.update(nextSettings);
    return {
      cnyToJpyRate: saved.cnyToJpyRate,
      jpyToCnyRate: saved.jpyToCnyRate,
      aiEndpointUrl: saved.aiEndpointUrl,
      aiProtocol: saved.aiProtocol,
      aiModel: saved.aiModel,
      hasApiKey: Boolean(saved.aiApiKey),
      aiApiKeyMasked: maskApiKey(saved.aiApiKey),
    };
  }

  async testConnection(input: unknown) {
    const resolved = this.resolveTransientSettings(input);
    const models = await this.loadModels(resolved);
    return {
      ok: true,
      modelCount: models.length,
    };
  }

  async loadModels(input?: unknown) {
    const resolved = this.resolveTransientSettings(input);
    const modelsUrl = deriveModelsUrl(resolved.aiEndpointUrl);
    const response = await this.fetchImpl(modelsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${resolved.aiApiKey}`,
      },
    });

    if (!response.ok) {
      throw new HttpError(response.status, '模型列表获取失败');
    }

    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    return (payload.data ?? [])
      .map((item) => item.id?.trim())
      .filter((item): item is string => Boolean(item));
  }

  private resolveTransientSettings(input?: unknown): SettingsRecord {
    const existing = this.settingsRepository.get();

    if (input === undefined) {
      if (!existing.aiEndpointUrl || !existing.aiApiKey) {
        throw new HttpError(400, '请先在设置中填写 API 地址和 Key');
      }
      return existing;
    }

    const parsed = transientSettingsSchema.parse(input);
    const aiEndpointUrl = parsed.aiEndpointUrl || existing.aiEndpointUrl;
    const aiApiKey = parsed.aiApiKey || existing.aiApiKey;

    if (!aiEndpointUrl || !aiApiKey) {
      throw new HttpError(400, 'API 地址和 Key 不能为空');
    }

    return {
      ...existing,
      aiEndpointUrl: buildEndpointUrl(
        aiEndpointUrl,
        parsed.aiProtocol ?? deriveProtocol(aiEndpointUrl),
      ),
      aiApiKey,
      aiProtocol: parsed.aiProtocol ?? deriveProtocol(aiEndpointUrl),
    };
  }
}
