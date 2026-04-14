import type { DatabaseSync } from 'node:sqlite';

import { normalizeParsedDraft } from '../domain/ai.js';
import type { ParsedTransactionDraft } from '../domain/types.js';
import { HttpError } from '../lib/http-error.js';
import type { FetchLike } from '../lib/provider.js';
import { extractJsonObject, extractTextPayload } from '../lib/provider.js';
import { AccountsRepository } from '../repositories/accounts-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';

export class AiService {
  private readonly accountsRepository: AccountsRepository;
  private readonly settingsRepository: SettingsRepository;

  constructor(
    private readonly db: DatabaseSync,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.accountsRepository = new AccountsRepository(db);
    this.settingsRepository = new SettingsRepository(db);
  }

  async parseTransaction(
    inputText: string,
    fallbackOccurredAt?: string,
  ): Promise<ParsedTransactionDraft> {
    const settings = this.settingsRepository.get();
    if (!settings.aiEndpointUrl || !settings.aiApiKey || !settings.aiModel) {
      throw new HttpError(400, '请先完整配置 AI 地址、Key 和模型');
    }

    const accounts = this.accountsRepository.list();
    const requestBody =
      settings.aiProtocol === 'responses'
        ? {
            model: settings.aiModel,
            input: [
              {
                role: 'system',
                content: [
                  {
                    type: 'input_text',
                    text: buildSystemPrompt(
                      accounts.map((account) => account.name),
                      fallbackOccurredAt,
                    ),
                  },
                ],
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: inputText,
                  },
                ],
              },
            ],
          }
        : {
            model: settings.aiModel,
            messages: [
              {
                role: 'system',
                content: buildSystemPrompt(
                  accounts.map((account) => account.name),
                  fallbackOccurredAt,
                ),
              },
              {
                role: 'user',
                content: inputText,
              },
            ],
          };

    const response = await this.fetchImpl(settings.aiEndpointUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const rawPayload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      this.logParse(inputText, '', JSON.stringify(rawPayload), false, 'AI 请求失败');
      throw new HttpError(response.status, 'AI 解析请求失败');
    }

    try {
      const textPayload = extractTextPayload(settings.aiProtocol, rawPayload);
      const rawDraft = extractJsonObject(textPayload);
      const draft = normalizeParsedDraft(rawDraft, inputText, accounts, fallbackOccurredAt);
      this.logParse(inputText, JSON.stringify(draft), JSON.stringify(rawPayload), true, '');
      return draft;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 解析失败';
      this.logParse(inputText, '', JSON.stringify(rawPayload), false, message);
      throw error;
    }
  }

  private logParse(
    inputText: string,
    parsedJson: string,
    rawResponse: string,
    success: boolean,
    errorMessage: string,
  ): void {
    this.db
      .prepare(
        `
        insert into ai_parse_logs (
          input_text, parsed_json, raw_response, success, error_message, created_at
        ) values (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        inputText,
        parsedJson,
        rawResponse,
        success ? 1 : 0,
        errorMessage,
        new Date().toISOString(),
      );
  }
}

function buildSystemPrompt(accountNames: string[], fallbackOccurredAt?: string): string {
  const lines = [
    '你是私人记账助手。',
    '请把用户输入解析成严格 JSON，不要输出额外文字。',
    'JSON 字段必须包含: type,title,amount,currency,accountName,targetAccountName,category,occurredAt,note,warnings。',
    'type 仅允许: expense,income,transfer,credit_spending,credit_repayment。',
    'currency 仅允许: CNY,JPY。',
    `可用账户: ${accountNames.join('、')}。`,
    '字段语义（严格遵守）:',
    '- expense: accountName=扣款账户（资产），targetAccountName 留空。',
    '- income: targetAccountName=入账账户（资产），accountName 留空。',
    '- transfer: accountName=转出账户，targetAccountName=转入账户（都是资产）。',
    '- credit_spending: targetAccountName=信用卡/负债账户，accountName 留空。',
    '- credit_repayment: accountName=还款来源（资产），targetAccountName=被还的负债账户。',
    '如果用户输入是"设置初始金额/调整初始余额"之类的账户设置诉求（不是一笔流水），请在 warnings 里提醒用户到总览页直接编辑账户初始余额，并仍按 income 解析以便估算。',
    '如果无法确定账户，请填空字符串并在 warnings 中说明。',
  ];

  if (fallbackOccurredAt) {
    lines.push(
      `基准时间: ${fallbackOccurredAt}。`,
      '如果用户输入没有明确指定时间，请直接使用这个基准时间填入 occurredAt。',
      '如果用户输入明确指定了时间，请优先使用用户指定的时间。',
    );
  } else {
    lines.push('如果没有日期，请使用当前时间并在 warnings 中说明。');
  }

  return lines.join('\n');
}
