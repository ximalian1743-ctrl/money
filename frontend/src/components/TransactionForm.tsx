import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { AccountBalance, CreateTransactionInput, TransactionType } from '../types/api';

interface TransactionFormProps {
  accounts: AccountBalance[];
  submitLabel: string;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
}

function getDefaultSourceAccount(accounts: AccountBalance[]) {
  return accounts.find((account) => account.kind === 'asset')?.name ?? '';
}

function getDefaultLiabilityAccount(accounts: AccountBalance[]) {
  return accounts.find((account) => account.kind === 'liability')?.name ?? '';
}

function toDatetimeLocalValue(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoString(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function TransactionForm({ accounts, submitLabel, onSubmit }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState<'CNY' | 'JPY'>('CNY');
  const [sourceAccountName, setSourceAccountName] = useState(getDefaultSourceAccount(accounts));
  const [targetAccountName, setTargetAccountName] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue());

  const assetAccounts = useMemo(
    () => accounts.filter((account) => account.kind === 'asset'),
    [accounts],
  );
  const liabilityAccounts = useMemo(
    () => accounts.filter((account) => account.kind === 'liability'),
    [accounts],
  );

  useEffect(() => {
    if (!sourceAccountName && assetAccounts[0]) {
      setSourceAccountName(assetAccounts[0].name);
    }
    if (
      !targetAccountName &&
      liabilityAccounts[0] &&
      (type === 'credit_spending' || type === 'credit_repayment')
    ) {
      setTargetAccountName(liabilityAccounts[0].name);
    }
  }, [assetAccounts, liabilityAccounts, sourceAccountName, targetAccountName, type]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAmount = Number(amount);
    const payload: CreateTransactionInput = {
      type,
      title,
      amount: normalizedAmount,
      currency,
      category,
      note,
      occurredAt: toIsoString(occurredAt),
    };

    if (type === 'expense') {
      payload.sourceAccountName = sourceAccountName || getDefaultSourceAccount(accounts);
    }

    if (type === 'income') {
      payload.targetAccountName = targetAccountName || getDefaultSourceAccount(accounts);
    }

    if (type === 'transfer') {
      payload.sourceAccountName = sourceAccountName || getDefaultSourceAccount(accounts);
      payload.targetAccountName = targetAccountName || getDefaultSourceAccount(accounts);
    }

    if (type === 'credit_spending') {
      payload.targetAccountName = targetAccountName || getDefaultLiabilityAccount(accounts);
    }

    if (type === 'credit_repayment') {
      payload.sourceAccountName = sourceAccountName || getDefaultSourceAccount(accounts);
      payload.targetAccountName = targetAccountName || getDefaultLiabilityAccount(accounts);
    }

    await onSubmit(payload);
  }

  return (
    <form className="panel form-grid" onSubmit={handleSubmit}>
      <div className="panel__header">
        <h2>手动记账</h2>
        <p>收入、支出、转账和信用卡还款都从这里录入。</p>
      </div>

      <label className="field">
        <span>类型</span>
        <select
          aria-label="类型"
          value={type}
          onChange={(event) => {
            const nextType = event.target.value as TransactionType;
            setType(nextType);
            if (nextType === 'credit_spending') {
              setTargetAccountName(getDefaultLiabilityAccount(accounts));
              setCurrency('JPY');
            }
          }}
        >
          <option value="expense">支出</option>
          <option value="income">收入</option>
          <option value="transfer">转账</option>
          <option value="credit_spending">信用消费</option>
          <option value="credit_repayment">信用还款</option>
        </select>
      </label>

      <label className="field">
        <span>标题</span>
        <input aria-label="标题" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <label className="field">
        <span>金额</span>
        <input
          aria-label="金额"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <label className="field">
        <span>币种</span>
        <select
          aria-label="币种"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as 'CNY' | 'JPY')}
        >
          <option value="CNY">人民币</option>
          <option value="JPY">日元</option>
        </select>
      </label>

      {type !== 'income' && type !== 'credit_spending' ? (
        <label className="field">
          <span>支付账户</span>
          <select
            aria-label="支付账户"
            value={sourceAccountName}
            onChange={(event) => setSourceAccountName(event.target.value)}
          >
            {assetAccounts.map((account) => (
              <option key={account.id} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {type !== 'expense' ? (
        <label className="field">
          <span>
            {type === 'income' ? '入账账户' : type === 'credit_spending' ? '信用账户' : '目标账户'}
          </span>
          <select
            aria-label={
              type === 'income' ? '入账账户' : type === 'credit_spending' ? '信用账户' : '目标账户'
            }
            value={targetAccountName}
            onChange={(event) => setTargetAccountName(event.target.value)}
          >
            {(type === 'credit_spending' || type === 'credit_repayment'
              ? liabilityAccounts
              : assetAccounts
            ).map((account) => (
              <option key={account.id} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        <span>分类</span>
        <input
          aria-label="分类"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </label>

      <label className="field">
        <span>备注</span>
        <textarea
          aria-label="备注"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <label className="field">
        <span>时间</span>
        <input
          aria-label="时间"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </label>

      <button type="submit" className="button">
        {submitLabel}
      </button>
    </form>
  );
}
