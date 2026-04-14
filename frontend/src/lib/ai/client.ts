import { normalizeParsedDraft } from '../domain/ai-draft';
import type {
  AccountRecord,
  AiProtocol,
  ParsedTransactionDraft,
  SettingsRecord,
} from '../domain/types';
import { deriveModelsUrl, extractJsonObject, extractTextPayload } from './provider';

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

function buildRequestBody(options: {
  protocol: AiProtocol;
  model: string;
  systemPrompt: string;
  userTextContent: string;
  imageDataUrl?: string;
}): Record<string, unknown> {
  const { protocol, model, systemPrompt, userTextContent, imageDataUrl } = options;
  if (protocol === 'responses') {
    return {
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: imageDataUrl
            ? [
                { type: 'input_text', text: userTextContent },
                { type: 'input_image', image_url: imageDataUrl },
              ]
            : [{ type: 'input_text', text: userTextContent }],
        },
      ],
    };
  }

  return {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: imageDataUrl
          ? [
              { type: 'text', text: userTextContent },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ]
          : userTextContent,
      },
    ],
  };
}

async function callAi(
  settings: SettingsRecord,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!settings.aiEndpointUrl || !settings.aiApiKey || !settings.aiModel) {
    throw new Error('请先完整配置 AI 地址、Key 和模型');
  }
  const response = await fetch(settings.aiEndpointUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (payload.error as { message?: string } | undefined)?.message ?? 'AI 解析请求失败';
    throw new Error(message);
  }
  return payload;
}

export async function parseTransactionText(options: {
  settings: SettingsRecord;
  accounts: readonly AccountRecord[];
  inputText: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedTransactionDraft> {
  const { settings, accounts, inputText, fallbackOccurredAt } = options;
  const systemPrompt = buildSystemPrompt(
    accounts.map((account) => account.name),
    fallbackOccurredAt,
  );
  const body = buildRequestBody({
    protocol: settings.aiProtocol,
    model: settings.aiModel,
    systemPrompt,
    userTextContent: inputText,
  });
  const payload = await callAi(settings, body);
  const text = extractTextPayload(settings.aiProtocol, payload);
  const raw = extractJsonObject(text);
  return normalizeParsedDraft(raw, inputText, accounts, fallbackOccurredAt);
}

export async function parseReceiptImage(options: {
  settings: SettingsRecord;
  accounts: readonly AccountRecord[];
  imageDataUrl: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedTransactionDraft> {
  const { settings, accounts, imageDataUrl, fallbackOccurredAt } = options;
  const userInstruction =
    '请从这张票据图片中识别出购买内容、金额、币种、商家/场景，并按约定的 JSON 字段返回。' +
    '如果无法确定账户，请在 warnings 中提醒用户手动选择。';
  const systemPrompt = buildSystemPrompt(
    accounts.map((account) => account.name),
    fallbackOccurredAt,
  );
  const body = buildRequestBody({
    protocol: settings.aiProtocol,
    model: settings.aiModel,
    systemPrompt,
    userTextContent: userInstruction,
    imageDataUrl,
  });
  const payload = await callAi(settings, body);
  const text = extractTextPayload(settings.aiProtocol, payload);
  const raw = extractJsonObject(text);
  const stubInput = `[receipt-image] ${imageDataUrl.slice(0, 64)}...`;
  return normalizeParsedDraft(raw, stubInput, accounts, fallbackOccurredAt);
}

export async function loadModels(
  settings: Pick<SettingsRecord, 'aiEndpointUrl' | 'aiApiKey'>,
): Promise<string[]> {
  if (!settings.aiEndpointUrl || !settings.aiApiKey) {
    throw new Error('请先填写 API 地址和 Key');
  }
  const url = deriveModelsUrl(settings.aiEndpointUrl);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${settings.aiApiKey}` },
  });
  if (!response.ok) {
    throw new Error('模型列表获取失败');
  }
  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  return (payload.data ?? [])
    .map((item) => item.id?.trim())
    .filter((item): item is string => Boolean(item));
}
