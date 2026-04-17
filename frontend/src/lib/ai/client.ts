import { normalizeParsedDraft } from '../domain/ai-draft';
import type {
  AccountRecord,
  AiProtocol,
  ParsedTransactionDraft,
  SettingsRecord,
} from '../domain/types';
import { deriveModelsUrl, extractJsonPayload, extractTextPayload } from './provider';

function buildSystemPrompt(accountNames: string[], fallbackOccurredAt?: string): string {
  const billAccount = accountNames.find((n) => n.includes('纸币')) ?? '现金纸币';
  const coinAccount = accountNames.find((n) => n.includes('硬币')) ?? '现金硬币';
  const lines = [
    '你是私人记账助手。',
    '请把用户输入解析成严格 JSON，不要输出额外文字。',
    'JSON 字段必须包含: type,title,amount,currency,accountName,targetAccountName,category,occurredAt,note,warnings。',
    'type 仅允许: expense,income,transfer,credit_spending,credit_repayment,credit_transfer。',
    'currency 仅允许: CNY,JPY。',
    `可用账户: ${accountNames.join('、')}。`,
    '字段语义（严格遵守）:',
    '- expense: accountName=扣款账户（资产），targetAccountName 留空。',
    '- income: targetAccountName=入账账户（资产），accountName 留空。',
    '- transfer: accountName=转出账户，targetAccountName=转入账户（都是资产）。',
    '- credit_spending: targetAccountName=信用卡/负债账户，accountName 留空。仅用于普通信用卡消费，不产生任何资产变动。',
    '- credit_repayment: accountName=还款来源（资产），targetAccountName=被还的负债账户。',
    '- credit_transfer: accountName=付款的信用卡（负债账户），targetAccountName=被充值的资产账户（如交通卡、电子钱包）。用于用信用卡向资产账户充值/转账的场景，信用卡欠款增加，资产账户余额同步增加。',
    '如果用户输入是"设置初始金额/调整初始余额"之类的账户设置诉求（不是一笔流水），请在 warnings 里提醒用户到总览页直接编辑账户初始余额，并仍按 income 解析以便估算。',
    '如果无法确定账户，请填空字符串并在 warnings 中说明。',
    '如果用户输入包含多笔交易（如"午饭38元，地铁3元"），请返回 JSON 数组，每笔交易一个对象。',
    '如果只有一笔交易，返回单个 JSON 对象即可。',
    '',
    '【现金找零场景 — 核心规则，务必严格执行】',
    `用户在日本超市/便利店用纸币付款（账户"${billAccount}"），店家找回纸币+硬币（硬币进"${coinAccount}"）。`,
    '识别关键词：找零 / 找回 / 找我 / 找给 / 找了 / おつり / change。',
    '守恒恒等式：付款金额 = 实际支出 + 找零纸币 + 找零硬币。',
    '分辨纸币 vs 硬币找零：',
    '  · 出现"硬币/こうか/小钱/零钱/coin/¥1/¥5/¥10/¥50/¥100/¥500"→ 硬币找零',
    '  · 出现"纸币/千/千元/1000/2000/5000/张/枚/bill"→ 纸币找零',
    '  · 未指定类型时默认全部为纸币找零（日本最常见）',
    '输出格式（找零场景必须严格按此）：',
    '  返回 JSON 数组。',
    `  第 1 条 = expense：amount=实际支出（已扣除所有找零），accountName="${billAccount}"（或用户指定的纸币/付款账户）。`,
    `  第 2 条仅在"找零硬币>0"时输出 = transfer：amount=找零硬币金额，accountName="${billAccount}"，targetAccountName="${coinAccount}"，category="找零"，title="<原title>·找零硬币"。`,
    '  找零纸币回到同一纸币账户，为自抵消项，不要单独开一笔流水。',
    '',
    '【找零场景示例】',
    `① 用户："买菜花了5755日元，找零硬币245" → [{type:"expense",title:"买菜",amount:5755,currency:"JPY",accountName:"${billAccount}",category:"餐饮",...},{type:"transfer",title:"买菜·找零硬币",amount:245,currency:"JPY",accountName:"${billAccount}",targetAccountName:"${coinAccount}",category:"找零",...}]`,
    `② 用户："付了1万纸币，店家找我4245日元，其中245是硬币" → 实际支出=10000-4245=5755 → [{type:"expense",amount:5755,accountName:"${billAccount}",...},{type:"transfer",amount:245,accountName:"${billAccount}",targetAccountName:"${coinAccount}",category:"找零",...}]`,
    `③ 用户："付1万买菜6360，找回3张一千和640硬币" → [{type:"expense",amount:6360,...},{type:"transfer",amount:640,category:"找零",...}]`,
    `④ 用户："花了6000，找回300硬币" → [{type:"expense",amount:6000,...},{type:"transfer",amount:300,category:"找零",...}]`,
    `⑤ 用户："付1000找了200" → 未说硬币，默认纸币找零 → 只输出 [{type:"expense",amount:800,accountName:"${billAccount}",...}]（找零纸币自抵消）。`,
    `⑥ 用户："买菜800" → 无找零关键词 → 单条 [{type:"expense",amount:800,...}]。`,
    '输出前务必核对：付款金额 = 支出金额 + 数组中所有 transfer(category="找零") 之和 + 未列出的纸币找零。',
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
}): Promise<ParsedTransactionDraft[]> {
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
  const raw = extractJsonPayload(text);
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeParsedDraft(item, inputText, accounts, fallbackOccurredAt));
  }
  return [normalizeParsedDraft(raw, inputText, accounts, fallbackOccurredAt)];
}

export async function parseReceiptImage(options: {
  settings: SettingsRecord;
  accounts: readonly AccountRecord[];
  imageDataUrl: string;
  fallbackOccurredAt?: string;
}): Promise<ParsedTransactionDraft[]> {
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
  const raw = extractJsonPayload(text);
  const stubInput = `[receipt-image] ${imageDataUrl.slice(0, 64)}...`;
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeParsedDraft(item, stubInput, accounts, fallbackOccurredAt));
  }
  return [normalizeParsedDraft(raw, stubInput, accounts, fallbackOccurredAt)];
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
