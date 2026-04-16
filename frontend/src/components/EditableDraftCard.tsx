import { useMemo, useState } from 'react';

import type {
  AccountBalance,
  CreateTransactionInput,
  ParsedDraft,
  TransactionType,
} from '../types/api';
import type { ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';

interface EditableDraftCardProps {
  draft: ParsedDraft;
  accounts: AccountBalance[];
  rates: ExchangeRates;
  onConfirm: (input: CreateTransactionInput) => Promise<void>;
  onDiscard: () => void;
  originalInput?: string;
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'transfer', label: '转账' },
  { value: 'credit_spending', label: '信用消费' },
  { value: 'credit_repayment', label: '信用还款' },
  { value: 'credit_transfer', label: '信用充值' },
];

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditableDraftCard({
  draft,
  accounts,
  rates,
  onConfirm,
  onDiscard,
  originalInput,
}: EditableDraftCardProps) {
  const [type, setType] = useState<TransactionType>(draft.type);
  const [title, setTitle] = useState(draft.title);
  const [amount, setAmount] = useState(String(draft.amount));
  const [currency, setCurrency] = useState<'CNY' | 'JPY'>(draft.currency);
  const [accountName, setAccountName] = useState(draft.accountName);
  const [targetAccountName, setTargetAccountName] = useState(draft.targetAccountName);
  const [category, setCategory] = useState(draft.category);
  const [note, setNote] = useState(draft.note);
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue(draft.occurredAt));
  const [pending, setPending] = useState(false);

  const assetAccounts = useMemo(() => accounts.filter((a) => a.kind === 'asset'), [accounts]);
  const liabilityAccounts = useMemo(
    () => accounts.filter((a) => a.kind === 'liability'),
    [accounts],
  );

  const needsSource =
    type === 'expense' ||
    type === 'transfer' ||
    type === 'credit_repayment' ||
    type === 'credit_transfer';
  const needsTarget =
    type === 'income' ||
    type === 'transfer' ||
    type === 'credit_spending' ||
    type === 'credit_repayment' ||
    type === 'credit_transfer';

  function getSourceOptions() {
    return type === 'credit_transfer' ? liabilityAccounts : assetAccounts;
  }

  function getTargetOptions() {
    return type === 'credit_spending' || type === 'credit_repayment'
      ? liabilityAccounts
      : assetAccounts;
  }

  async function handleConfirm() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const parsed = new Date(occurredAt);
    const isoTime = Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();

    const input: CreateTransactionInput = {
      type,
      title: title || '未命名',
      amount: parsedAmount,
      currency,
      category,
      note,
      occurredAt: isoTime,
      origin: 'ai',
      aiInputText: originalInput ?? '',
    };
    if (needsSource) input.sourceAccountName = accountName;
    if (needsTarget) input.targetAccountName = targetAccountName;

    setPending(true);
    try {
      await onConfirm(input);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel form-grid editable-draft">
      <div className="panel__header">
        <h2>解析结果</h2>
        <p>可修改任意字段后确认入账。</p>
      </div>

      {draft.warnings.length > 0 ? (
        <ul className="warning-list">
          {draft.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <label className="field">
        <span>类型</span>
        <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>标题</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="editable-draft__row">
        <label className="field" style={{ flex: 2 }}>
          <span>金额</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>币种</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'CNY' | 'JPY')}>
            <option value="CNY">人民币</option>
            <option value="JPY">日元</option>
          </select>
        </label>
      </div>

      {Number(amount) > 0 ? (
        <div className="editable-draft__preview">
          <NativeDualCurrencyAmount amount={Number(amount)} currency={currency} rates={rates} />
        </div>
      ) : null}

      {needsSource ? (
        <label className="field">
          <span>{type === 'credit_transfer' ? '信用账户（付款）' : '支付账户'}</span>
          <select value={accountName} onChange={(e) => setAccountName(e.target.value)}>
            <option value="">请选择</option>
            {getSourceOptions().map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {needsTarget ? (
        <label className="field">
          <span>
            {type === 'income'
              ? '入账账户'
              : type === 'credit_spending'
                ? '信用账户'
                : type === 'credit_transfer'
                  ? '充值账户（到账）'
                  : '目标账户'}
          </span>
          <select value={targetAccountName} onChange={(e) => setTargetAccountName(e.target.value)}>
            <option value="">请选择</option>
            {getTargetOptions().map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        <span>分类</span>
        <input value={category} onChange={(e) => setCategory(e.target.value)} />
      </label>

      <label className="field">
        <span>时间</span>
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </label>

      <label className="field">
        <span>备注</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="form-actions">
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={() => void handleConfirm()}
        >
          {pending ? '保存中...' : '确认入账'}
        </button>
        <button type="button" className="button button--ghost" onClick={onDiscard}>
          放弃
        </button>
      </div>
    </section>
  );
}
