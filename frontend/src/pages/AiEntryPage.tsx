import { useState, type ChangeEvent } from 'react';

import { createTransaction, parseReceiptImage, parseTransaction } from '../lib/api';
import { useAppData } from '../hooks/useAppData';
import { useMutationState } from '../hooks/useMutationState';
import { compressImageToDataUrl } from '../lib/image';
import type { AccountBalance, CreateTransactionInput, ParsedDraft } from '../types/api';
import { EditableDraftCard } from '../components/EditableDraftCard';

interface AiEntryPageProps {
  accounts?: AccountBalance[];
  parseTransactionImpl?: (input: {
    inputText: string;
    fallbackOccurredAt?: string;
  }) => Promise<ParsedDraft[]>;
  parseReceiptImpl?: (input: {
    imageDataUrl: string;
    fallbackOccurredAt?: string;
  }) => Promise<ParsedDraft[]>;
  compressImageImpl?: (file: File) => Promise<string>;
  createTransactionImpl?: (input: CreateTransactionInput) => Promise<unknown>;
}

interface PersistedAiEntryState {
  inputText: string;
  fallbackOccurredAtLocal: string;
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

function loadPersistedState(): PersistedAiEntryState {
  const fallback: PersistedAiEntryState = {
    inputText: '',
    fallbackOccurredAtLocal: toDatetimeLocalValue(),
  };
  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
    return fallback;
  }
  const raw = window.localStorage.getItem(AI_ENTRY_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as PersistedAiEntryState;
    return {
      inputText: parsed.inputText ?? '',
      fallbackOccurredAtLocal: parsed.fallbackOccurredAtLocal ?? fallback.fallbackOccurredAtLocal,
    };
  } catch {
    return fallback;
  }
}

function persist(state: PersistedAiEntryState) {
  if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') return;
  window.localStorage.setItem(AI_ENTRY_STORAGE_KEY, JSON.stringify(state));
}

export function AiEntryPage({
  parseTransactionImpl = parseTransaction,
  parseReceiptImpl = parseReceiptImage,
  compressImageImpl = compressImageToDataUrl,
  createTransactionImpl = createTransaction,
}: AiEntryPageProps) {
  const appData = useAppData();
  const { pending, message, setMessage, run } = useMutationState();
  const [inputText, setInputText] = useState(() => loadPersistedState().inputText);
  const [fallbackOccurredAtLocal, setFallbackOccurredAtLocal] = useState(
    () => loadPersistedState().fallbackOccurredAtLocal,
  );
  const [drafts, setDrafts] = useState<ParsedDraft[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  async function handleParse() {
    const fallbackOccurredAt = toIsoString(fallbackOccurredAtLocal);
    try {
      const nextDrafts = await run(
        () => parseTransactionImpl({ inputText, fallbackOccurredAt }),
        `解析完成，共 ${drafts.length} 笔`,
      );
      setDrafts(nextDrafts);
      setSavedCount(0);
    } catch {
      setDrafts([]);
    }
  }

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const fallbackOccurredAt = toIsoString(fallbackOccurredAtLocal);
    try {
      const imageDataUrl = await compressImageImpl(file);
      setReceiptPreview(imageDataUrl);
      const nextDrafts = await run(
        () => parseReceiptImpl({ imageDataUrl, fallbackOccurredAt }),
        '图片解析完成',
      );
      setDrafts(nextDrafts);
      setSavedCount(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '图片解析失败');
      setDrafts([]);
    }
  }

  async function handleConfirmOne(index: number, input: CreateTransactionInput) {
    await createTransactionImpl(input);
    await appData.reload();
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    setSavedCount((c) => c + 1);
    setMessage(`已保存 ${savedCount + 1} 笔`);
  }

  function handleDiscardOne(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmAll() {
    // Confirm all drafts sequentially — each needs user's current edits
    // This button is a convenience; individual cards handle their own edits
    setMessage('请逐条确认每笔交易');
  }

  return (
    <section className="stack">
      <div className="panel form-grid">
        <div className="panel__header">
          <h2>AI 记账</h2>
          <p>输入中文短句，支持一次多笔，如"午饭38元现金，地铁3元西瓜卡"。</p>
        </div>

        <label className="field">
          <span>记账内容</span>
          <textarea
            aria-label="记账内容"
            rows={5}
            value={inputText}
            onChange={(event) => {
              const next = event.target.value;
              setInputText(next);
              persist({ inputText: next, fallbackOccurredAtLocal });
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
              const next = event.target.value;
              setFallbackOccurredAtLocal(next);
              persist({ inputText, fallbackOccurredAtLocal: next });
            }}
          />
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => void handleParse()}
          >
            {pending ? '解析中...' : '解析文字'}
          </button>
          <label className="button button--ghost">
            上传收据图片
            <input
              aria-label="上传收据图片"
              type="file"
              accept="image/*"
              onChange={(event) => void handleImagePick(event)}
              className="visually-hidden-input"
            />
          </label>
        </div>

        {receiptPreview ? (
          <figure className="receipt-preview">
            <img src={receiptPreview} alt="上传的收据预览" />
            <figcaption>已识别的收据，可再次点击按钮替换</figcaption>
          </figure>
        ) : null}

        {message ? <p className="status">{message}</p> : null}
      </div>

      {drafts.length > 1 ? (
        <div className="multi-draft-header">
          <span>共解析出 {drafts.length} 笔交易，逐条确认或修改后入账</span>
        </div>
      ) : null}

      {drafts.map((draft, index) => (
        <EditableDraftCard
          key={`${draft.title}-${draft.amount}-${index}`}
          draft={draft}
          accounts={appData.accounts}
          rates={appData.settings}
          originalInput={inputText}
          onConfirm={(input) => handleConfirmOne(index, input)}
          onDiscard={() => handleDiscardOne(index)}
        />
      ))}
    </section>
  );
}
