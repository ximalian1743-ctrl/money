import { useState } from 'react';

import { createTransaction, parseTransaction } from '../lib/api';
import { useAppData } from '../hooks/useAppData';
import { useMutationState } from '../hooks/useMutationState';
import type { AccountBalance, CreateTransactionInput, ParsedDraft } from '../types/api';
import { ParsedDraftCard } from '../components/ParsedDraftCard';

interface AiEntryPageProps {
  accounts?: AccountBalance[];
  parseTransactionImpl?: (input: {
    inputText: string;
    fallbackOccurredAt?: string;
  }) => Promise<ParsedDraft>;
  createTransactionImpl?: (input: CreateTransactionInput) => Promise<unknown>;
}

interface PersistedAiEntryState {
  inputText: string;
  fallbackOccurredAtLocal: string;
  draft: ParsedDraft | null;
}

const AI_ENTRY_STORAGE_KEY = 'money-record:ai-entry-state';

function toDatetimeLocalValue(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoString(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function loadPersistedAiEntryState(): PersistedAiEntryState {
  const fallbackState: PersistedAiEntryState = {
    inputText: '',
    fallbackOccurredAtLocal: toDatetimeLocalValue(),
    draft: null
  };

  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
    return fallbackState;
  }

  const raw = window.localStorage.getItem(AI_ENTRY_STORAGE_KEY);
  if (!raw) {
    return fallbackState;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAiEntryState;
    return {
      inputText: parsed.inputText ?? '',
      fallbackOccurredAtLocal: parsed.fallbackOccurredAtLocal ?? fallbackState.fallbackOccurredAtLocal,
      draft: parsed.draft ?? null
    };
  } catch {
    return fallbackState;
  }
}

function mapDraftToTransaction(draft: ParsedDraft): CreateTransactionInput {
  return {
    type: draft.type,
    title: draft.title,
    amount: draft.amount,
    currency: draft.currency,
    sourceAccountName:
      draft.type === 'expense' || draft.type === 'transfer' || draft.type === 'credit_repayment'
        ? draft.accountName
        : undefined,
    targetAccountName:
      draft.type === 'income' || draft.type === 'transfer'
        ? draft.targetAccountName
        : draft.type === 'credit_spending' || draft.type === 'credit_repayment'
          ? draft.targetAccountName || draft.accountName
          : undefined,
    category: draft.category,
    note: draft.note,
    occurredAt: draft.occurredAt,
    origin: 'ai',
    aiInputText: draft.title
  };
}

export function AiEntryPage({
  parseTransactionImpl = parseTransaction,
  createTransactionImpl = createTransaction
}: AiEntryPageProps) {
  const appData = useAppData();
  const { pending, message, setMessage, run } = useMutationState();
  const [inputText, setInputText] = useState(() => loadPersistedAiEntryState().inputText);
  const [fallbackOccurredAtLocal, setFallbackOccurredAtLocal] = useState(
    () => loadPersistedAiEntryState().fallbackOccurredAtLocal
  );
  const [draft, setDraft] = useState<ParsedDraft | null>(() => loadPersistedAiEntryState().draft);

  function persistState(nextState: PersistedAiEntryState) {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
      return;
    }

    window.localStorage.setItem(AI_ENTRY_STORAGE_KEY, JSON.stringify(nextState));
  }

  async function handleParse() {
    const fallbackOccurredAt = toIsoString(fallbackOccurredAtLocal);
    try {
      const nextDraft = await run(
        () =>
          parseTransactionImpl({
            inputText,
            fallbackOccurredAt
          }),
        '解析完成'
      );
      setDraft(nextDraft);
      persistState({
        inputText,
        fallbackOccurredAtLocal,
        draft: nextDraft
      });
    } catch {
      setDraft(null);
      persistState({
        inputText,
        fallbackOccurredAtLocal,
        draft: null
      });
    }
  }

  async function handleConfirm() {
    if (!draft) {
      return;
    }

    await run(async () => {
      await createTransactionImpl(mapDraftToTransaction(draft));
      await appData.reload();
    }, '已保存到流水');
    setDraft(null);
    persistState({
      inputText,
      fallbackOccurredAtLocal,
      draft: null
    });
    setMessage('已保存到流水');
  }

  return (
    <section className="stack">
      <div className="panel form-grid">
        <div className="panel__header">
          <h2>AI 记账</h2>
          <p>直接输入中文短句，例如“午饭38元，用现金纸币”。</p>
        </div>

        <label className="field">
          <span>记账内容</span>
          <textarea
            aria-label="记账内容"
            rows={5}
            value={inputText}
            onChange={(event) => {
              const nextInputText = event.target.value;
              setInputText(nextInputText);
              persistState({
                inputText: nextInputText,
                fallbackOccurredAtLocal,
                draft
              });
            }}
          />
        </label>

        <label className="field">
          <span>基准时间</span>
          <input
            aria-label="基准时间"
            type="datetime-local"
            value={fallbackOccurredAtLocal}
            onChange={(event) => {
              const nextValue = event.target.value;
              setFallbackOccurredAtLocal(nextValue);
              persistState({
                inputText,
                fallbackOccurredAtLocal: nextValue,
                draft
              });
            }}
          />
        </label>

        <button type="button" className="button" onClick={() => void handleParse()}>
          {pending ? '解析中...' : '解析'}
        </button>

        {message ? <p className="status">{message}</p> : null}
      </div>

      {draft ? <ParsedDraftCard draft={draft} rates={appData.settings} onConfirm={handleConfirm} /> : null}
    </section>
  );
}
