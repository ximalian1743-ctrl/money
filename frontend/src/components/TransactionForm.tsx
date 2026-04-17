import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { AccountBalance, CreateTransactionInput, TransactionType } from '../types/api';

interface TransactionFormProps {
  accounts: AccountBalance[];
  submitLabel: string;
  onSubmit: (inputs: CreateTransactionInput[]) => Promise<void>;
}

function getDefaultSourceAccount(accounts: AccountBalance[]) {
  return accounts.find((account) => account.kind === 'asset')?.name ?? '';
}

function getDefaultLiabilityAccount(accounts: AccountBalance[]) {
  return accounts.find((account) => account.kind === 'liability')?.name ?? '';
}

function getDefaultCoinAccount(accounts: AccountBalance[]) {
  return (
    accounts.find((account) => account.kind === 'asset' && account.name.includes('硬币'))?.name ??
    ''
  );
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
  const [changeEnabled, setChangeEnabled] = useState(false);
  const [paidAmount, setPaidAmount] = useState('0');
  const [changeBill, setChangeBill] = useState('0');
  const [changeCoin, setChangeCoin] = useState('0');
  const [coinAccountName, setCoinAccountName] = useState(getDefaultCoinAccount(accounts));

  const assetAccounts = useMemo(
    () => accounts.filter((account) => account.kind === 'asset'),
    [accounts],
  );
  const liabilityAccounts = useMemo(
    () => accounts.filter((account) => account.kind === 'liability'),
    [accounts],
  );

  const paidNum = Number(paidAmount) || 0;
  const billChangeNum = Number(changeBill) || 0;
  const coinChangeNum = Number(changeCoin) || 0;
  const computedExpense = Math.max(0, paidNum - billChangeNum - coinChangeNum);
  const changeMode = type === 'expense' && changeEnabled;

  useEffect(() => {
    if (!coinAccountName && assetAccounts.length) {
      const coin = getDefaultCoinAccount(accounts);
      if (coin) setCoinAccountName(coin);
    }
  }, [accounts, assetAccounts, coinAccountName]);

  useEffect(() => {
    if (type === 'credit_transfer') {
      // source must be a liability account
      if (!sourceAccountName && liabilityAccounts[0]) {
        setSourceAccountName(liabilityAccounts[0].name);
      }
      if (!targetAccountName && assetAccounts[0]) {
        setTargetAccountName(assetAccounts[0].name);
      }
    } else {
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
    }
  }, [assetAccounts, liabilityAccounts, sourceAccountName, targetAccountName, type]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const effectiveAmount = changeMode ? computedExpense : Number(amount);
    const occurredIso = toIsoString(occurredAt);
    const payload: CreateTransactionInput = {
      type,
      title,
      amount: effectiveAmount,
      currency,
      category,
      note,
      occurredAt: occurredIso,
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

    if (type === 'credit_transfer') {
      payload.sourceAccountName = sourceAccountName || getDefaultLiabilityAccount(accounts);
      payload.targetAccountName = targetAccountName || getDefaultSourceAccount(accounts);
    }

    const inputs: CreateTransactionInput[] = [payload];

    if (changeMode && coinChangeNum > 0) {
      const sourceName = payload.sourceAccountName ?? getDefaultSourceAccount(accounts);
      const coinName = coinAccountName || getDefaultCoinAccount(accounts);
      if (!coinName) {
        throw new Error('缺少硬币账户，请在账户管理中创建一个名称包含“硬币”的资产账户');
      }
      if (coinName === sourceName) {
        throw new Error('硬币账户不能与支付账户相同');
      }
      inputs.push({
        type: 'transfer',
        title: title ? `${title}·找零硬币` : '找零硬币',
        amount: coinChangeNum,
        currency,
        category,
        note,
        occurredAt: occurredIso,
        sourceAccountName: sourceName,
        targetAccountName: coinName,
      });
    }

    await onSubmit(inputs);
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
            if (nextType === 'credit_transfer') {
              setSourceAccountName(getDefaultLiabilityAccount(accounts));
              setTargetAccountName(getDefaultSourceAccount(accounts));
              setCurrency('JPY');
            }
          }}
        >
          <option value="expense">支出</option>
          <option value="income">收入</option>
          <option value="transfer">转账</option>
          <option value="credit_spending">信用消费</option>
          <option value="credit_repayment">信用还款</option>
          <option value="credit_transfer">信用充值（信用卡→资产账户）</option>
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
          value={changeMode ? String(computedExpense) : amount}
          onChange={(event) => setAmount(event.target.value)}
          readOnly={changeMode}
        />
      </label>

      {type === 'expense' ? (
        <label className="field field--inline">
          <input
            aria-label="使用现金找零"
            type="checkbox"
            checked={changeEnabled}
            onChange={(event) => setChangeEnabled(event.target.checked)}
          />
          <span>使用现金支付（含找零）</span>
        </label>
      ) : null}

      {changeMode ? (
        <div className="panel">
          <p>按收银台实际情况填写：付款 − 找零（纸币 + 硬币）= 实际支出 {computedExpense}</p>
          <label className="field">
            <span>付款金额</span>
            <input
              aria-label="付款金额"
              type="number"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
            />
          </label>
          <label className="field">
            <span>找零·纸币</span>
            <input
              aria-label="找零纸币"
              type="number"
              value={changeBill}
              onChange={(event) => setChangeBill(event.target.value)}
            />
          </label>
          <label className="field">
            <span>找零·硬币</span>
            <input
              aria-label="找零硬币"
              type="number"
              value={changeCoin}
              onChange={(event) => setChangeCoin(event.target.value)}
            />
          </label>
          <label className="field">
            <span>硬币账户</span>
            <select
              aria-label="硬币账户"
              value={coinAccountName}
              onChange={(event) => setCoinAccountName(event.target.value)}
            >
              <option value="">（请选择）</option>
              {assetAccounts.map((account) => (
                <option key={account.id} value={account.name}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

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
          <span>{type === 'credit_transfer' ? '信用账户（付款）' : '支付账户'}</span>
          <select
            aria-label={type === 'credit_transfer' ? '信用账户' : '支付账户'}
            value={sourceAccountName}
            onChange={(event) => setSourceAccountName(event.target.value)}
          >
            {(type === 'credit_transfer' ? liabilityAccounts : assetAccounts).map((account) => (
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
            {type === 'income'
              ? '入账账户'
              : type === 'credit_spending'
                ? '信用账户'
                : type === 'credit_transfer'
                  ? '充值账户（到账）'
                  : '目标账户'}
          </span>
          <select
            aria-label={
              type === 'income'
                ? '入账账户'
                : type === 'credit_spending'
                  ? '信用账户'
                  : type === 'credit_transfer'
                    ? '充值账户'
                    : '目标账户'
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
