import type { DatabaseSync } from 'node:sqlite';

import type { SettingsRecord } from '../domain/types.js';

interface SettingsUpdateInput extends SettingsRecord {}

export class SettingsRepository {
  constructor(private readonly db: DatabaseSync) {}

  get(): SettingsRecord {
    const row = this.db
      .prepare(`
        select cny_to_jpy_rate, jpy_to_cny_rate, ai_endpoint_url, ai_api_key, ai_protocol, ai_model
        from settings
        where id = 1
      `)
      .get() as Record<string, unknown>;

    return {
      cnyToJpyRate: Number(row.cny_to_jpy_rate),
      jpyToCnyRate: Number(row.jpy_to_cny_rate),
      aiEndpointUrl: String(row.ai_endpoint_url),
      aiApiKey: String(row.ai_api_key),
      aiProtocol: row.ai_protocol as SettingsRecord['aiProtocol'],
      aiModel: String(row.ai_model)
    };
  }

  update(input: SettingsUpdateInput): SettingsRecord {
    this.db
      .prepare(`
        update settings
        set
          cny_to_jpy_rate = ?,
          jpy_to_cny_rate = ?,
          ai_endpoint_url = ?,
          ai_api_key = ?,
          ai_protocol = ?,
          ai_model = ?,
          updated_at = ?
        where id = 1
      `)
      .run(
        input.cnyToJpyRate,
        input.jpyToCnyRate,
        input.aiEndpointUrl,
        input.aiApiKey,
        input.aiProtocol,
        input.aiModel,
        new Date().toISOString()
      );

    return this.get();
  }
}
