import { useState, type FormEvent } from 'react';

import type { CreateTransactionInput, TransactionType } from '../types/api';
import { BottomSheet } from './BottomSheet';

export interface QuickEntryTemplate {
  title: string;
  type: TransactionType;
  category: string;
  accountName: string;
  currency: 'CNY' | 'JPY';
}

interface QuickEntryModalProps {
  template: QuickEntryTemplate;
  onClose: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
}

export function QuickEntryModal({ template, onClose, onSubmit }: QuickEntryModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('请输入有效金额');
      return;
    }
    const input: CreateTransactionInput = {
      type: template.type,
      title: template.title,
      amount: parsedAmount,
      currency: template.currency,
      category: template.category,
      note,
      occurredAt: new Date().toISOString(),
      origin: 'manual',
    };
    if (template.type === 'expense') input.sourceAccountName = template.accountName;
    else if (template.type === 'credit_spending') input.targetAccountName = template.accountName;

    setPending(true);
    setError('');
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : '记录失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={`快捷记账 · ${template.title}`} locked={pending}>
      <p className="sheet__subtitle">
        账户：{template.accountName}
        {template.category ? ` · ${template.category}` : ''}
      </p>
      <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
        <label className="field">
          <span>金额（{template.currency === 'JPY' ? '円' : '元'}）</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span>备注（可选）</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error ? (
          <p className="status status--warning" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="submit" className="button" disabled={pending}>
            {pending ? '保存中...' : '确认记账'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
            disabled={pending}
          >
            取消
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
