import { useState, type FormEvent } from 'react';

import { createTransaction, updateAccountDetails } from '../lib/api';
import { formatCurrency, formatDateTime, type ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { AccountBalance, TransactionRecord, TransactionType } from '../types/api';

interface WalletDetailModalProps {
  account: AccountBalance;
  recentTransactions: TransactionRecord[];
  rates: ExchangeRates;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

type ViewMode = 'overview' | 'adjust' | 'editCredit';

function getDirectionSign(type: TransactionType): { sign: string; className: string } {
  switch (type) {
    case 'income':
      return { sign: '+', className: 'ledger-amount--income' };
    case 'expense':
    case 'credit_spending':
      return { sign: '-', className: 'ledger-amount--expense' };
    default:
      return { sign: '↔', className: 'ledger-amount--transfer' };
  }
}

export function WalletDetailModal({
  account,
  recentTransactions,
  rates,
  onClose,
  onRefresh,
}: WalletDetailModalProps) {
  const isCredit = account.kind === 'liability';
  const [mode, setMode] = useState<ViewMode>('overview');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wallet-modal__header">
          <div className="wallet-modal__title-row">
            <h3 className="modal-title">{account.name}</h3>
            {isCredit ? <span className="account-badge">信用卡</span> : null}
          </div>
          <div className="wallet-modal__balance">
            <NativeDualCurrencyAmount
              amount={account.balance}
              currency={account.currency}
              rates={rates}
              align="end"
            />
          </div>
        </div>

        {/* Credit card usage bar */}
        {isCredit && account.balance > 0 && account.creditLimit > 0 ? (
          <CreditUsageSection account={account} />
        ) : null}

        {/* Credit card payment info */}
        {isCredit &&
        (account.monthlyBillingDay || account.paymentDueDay || account.nextMonthRepayment) ? (
          <CreditDatesSection account={account} />
        ) : null}

        {/* Main content: switches between overview / adjust / editCredit */}
        {mode === 'overview' ? (
          <>
            {/* Recent transactions */}
            <div className="wallet-modal__section">
              <h4 className="wallet-modal__section-title">最近动账</h4>
              {recentTransactions.length === 0 ? (
                <p className="modal-confirm-text">暂无相关交易</p>
              ) : (
                <ul className="recent-tx-list">
                  {recentTransactions.slice(0, 8).map((item) => {
                    const dir = getDirectionSign(item.type);
                    return (
                      <li key={item.id} className="recent-tx-item">
                        <div className="recent-tx-item__left">
                          <strong>{item.title}</strong>
                          <span className="recent-tx-item__time">
                            {formatDateTime(item.occurredAt)}
                          </span>
                        </div>
                        <span className={`recent-tx-item__amount ${dir.className}`}>
                          {dir.sign}
                          {formatCurrency(item.amount, item.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Action buttons */}
            <div className="form-actions">
              <button type="button" className="button" onClick={() => setMode('adjust')}>
                调整余额
              </button>
              {isCredit ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setMode('editCredit')}
                >
                  编辑卡片信息
                </button>
              ) : null}
              <button type="button" className="button button--ghost" onClick={onClose}>
                关闭
              </button>
            </div>
          </>
        ) : mode === 'adjust' ? (
          <AdjustBalanceForm
            account={account}
            onCancel={() => setMode('overview')}
            onSaved={async () => {
              await onRefresh();
              onClose();
            }}
          />
        ) : (
          <EditCreditForm
            account={account}
            onCancel={() => setMode('overview')}
            onSaved={async () => {
              await onRefresh();
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function CreditUsageSection({ account }: { account: AccountBalance }) {
  const usagePct = Math.min(Math.round((account.balance / account.creditLimit) * 100), 100);
  const available = account.creditLimit - account.balance;
  const isHigh = usagePct > 70;
  return (
    <div className="credit-usage">
      <div className="credit-usage__bar">
        <div
          className={`credit-usage__fill${isHigh ? ' credit-usage__fill--high' : ''}`}
          style={{ width: `${usagePct}%` }}
        />
      </div>
      <div className="credit-usage__stats">
        <span>
          已用 <strong>{formatCurrency(account.balance, account.currency)}</strong>
        </span>
        <span>额度 {formatCurrency(account.creditLimit, account.currency)}</span>
      </div>
      <p className="credit-usage__available">
        可用 <strong>{formatCurrency(available, account.currency)}</strong>
      </p>
    </div>
  );
}

function CreditDatesSection({ account }: { account: AccountBalance }) {
  const { monthlyBillingDay, paymentDueDay, nextMonthRepayment, currency } = account;
  return (
    <div className="credit-dates">
      {monthlyBillingDay || paymentDueDay ? (
        <p className="credit-dates__row">
          {monthlyBillingDay ? `账单日 每月${monthlyBillingDay}日` : null}
          {monthlyBillingDay && paymentDueDay ? ' · ' : null}
          {paymentDueDay ? `还款截止 次月${paymentDueDay}日` : null}
        </p>
      ) : null}
      {nextMonthRepayment ? (
        <p className="credit-dates__repayment">
          下次应还{' '}
          <strong className="credit-dates__amount">
            {formatCurrency(nextMonthRepayment, currency)}
          </strong>
        </p>
      ) : null}
    </div>
  );
}

/* ─── Adjust Balance Form (creates adjustment transaction) ──────────── */

function AdjustBalanceForm({
  account,
  onCancel,
  onSaved,
}: {
  account: AccountBalance;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [targetBalance, setTargetBalance] = useState(String(account.balance));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const parsedTarget = Number(targetBalance);
  const delta = Number.isFinite(parsedTarget) ? parsedTarget - account.balance : 0;
  const isCredit = account.kind === 'liability';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(parsedTarget)) {
      setError('请输入有效金额');
      return;
    }
    if (delta === 0) {
      setError('新余额与当前余额相同，无需调整');
      return;
    }
    if (isCredit && delta < 0) {
      setError('信用卡欠款减少请使用"信用还款"记账');
      return;
    }

    setPending(true);
    setError('');
    try {
      const amount = Math.abs(delta);
      const occurredAt = new Date().toISOString();
      if (!isCredit) {
        // Asset: positive delta = income, negative delta = expense
        if (delta > 0) {
          await createTransaction({
            type: 'income',
            title: '余额调整',
            amount,
            currency: account.currency,
            targetAccountName: account.name,
            occurredAt,
            origin: 'manual',
          });
        } else {
          await createTransaction({
            type: 'expense',
            title: '余额调整',
            amount,
            currency: account.currency,
            sourceAccountName: account.name,
            occurredAt,
            origin: 'manual',
          });
        }
      } else {
        // Credit card, only supports increasing debt here
        await createTransaction({
          type: 'credit_spending',
          title: '余额调整',
          amount,
          currency: account.currency,
          targetAccountName: account.name,
          occurredAt,
          origin: 'manual',
        });
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '调整失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="wallet-modal__section form-grid" onSubmit={(e) => void handleSubmit(e)}>
      <h4 className="wallet-modal__section-title">
        调整{isCredit ? '欠款' : '余额'} — 创建「余额调整」流水
      </h4>
      <div className="wallet-modal__current">
        <span>当前{isCredit ? '欠款' : '余额'}</span>
        <strong>{formatCurrency(account.balance, account.currency)}</strong>
      </div>
      <label className="field">
        <span>
          新{isCredit ? '欠款' : '余额'}（{account.currency === 'JPY' ? '円' : '元'}）
        </span>
        <input
          type="number"
          step="0.01"
          value={targetBalance}
          onChange={(e) => setTargetBalance(e.target.value)}
          autoFocus
        />
      </label>
      {Number.isFinite(parsedTarget) && delta !== 0 ? (
        <p className="wallet-modal__delta">
          {delta > 0 ? '将创建' : '将创建'}{' '}
          <strong className={delta > 0 ? 'ledger-amount--income' : 'ledger-amount--expense'}>
            {delta > 0 ? '+' : '-'}
            {formatCurrency(Math.abs(delta), account.currency)}
          </strong>{' '}
          的{isCredit ? '信用消费' : delta > 0 ? '收入' : '支出'}流水
        </p>
      ) : null}
      {error ? (
        <p className="status status--warning" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? '保存中...' : '确认调整'}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={onCancel}
          disabled={pending}
        >
          返回
        </button>
      </div>
    </form>
  );
}

/* ─── Edit Credit Card Info Form ────────────────────────────────────── */

function EditCreditForm({
  account,
  onCancel,
  onSaved,
}: {
  account: AccountBalance;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [creditLimit, setCreditLimit] = useState(String(account.creditLimit ?? 0));
  const [monthlyBillingDay, setMonthlyBillingDay] = useState(
    account.monthlyBillingDay ? String(account.monthlyBillingDay) : '',
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account.paymentDueDay ? String(account.paymentDueDay) : '',
  );
  const [nextMonthRepayment, setNextMonthRepayment] = useState(
    account.nextMonthRepayment ? String(account.nextMonthRepayment) : '',
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function parseDay(raw: string, label: string): number | undefined {
    if (!raw) return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      throw new Error(`${label}请填 1-31 之间的整数`);
    }
    return n;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const parsedLimit = Number(creditLimit);
      const parsedBillingDay = parseDay(monthlyBillingDay, '账单日');
      const parsedPaymentDay = parseDay(paymentDueDay, '还款截止日');
      const parsedNext = nextMonthRepayment ? Number(nextMonthRepayment) : undefined;
      await updateAccountDetails(account.id, {
        creditLimit: Number.isFinite(parsedLimit) ? parsedLimit : 0,
        ...(parsedBillingDay !== undefined ? { monthlyBillingDay: parsedBillingDay } : {}),
        ...(parsedPaymentDay !== undefined ? { paymentDueDay: parsedPaymentDay } : {}),
        ...(parsedNext !== undefined ? { nextMonthRepayment: parsedNext } : {}),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="wallet-modal__section form-grid" onSubmit={(e) => void handleSubmit(e)}>
      <h4 className="wallet-modal__section-title">编辑卡片信息</h4>
      <label className="field">
        <span>信用额度（{account.currency}）</span>
        <input
          type="number"
          step="1"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
        />
      </label>
      <label className="field">
        <span>账单日（每月第几日，留空未设置）</span>
        <input
          type="number"
          min="1"
          max="31"
          step="1"
          placeholder="如 15"
          value={monthlyBillingDay}
          onChange={(e) => setMonthlyBillingDay(e.target.value)}
        />
      </label>
      <label className="field">
        <span>还款截止日（次月第几日，留空未设置）</span>
        <input
          type="number"
          min="1"
          max="31"
          step="1"
          placeholder="如 10"
          value={paymentDueDay}
          onChange={(e) => setPaymentDueDay(e.target.value)}
        />
      </label>
      <label className="field">
        <span>下次应还金额（{account.currency}，留空未设置）</span>
        <input
          type="number"
          step="0.01"
          placeholder="0"
          value={nextMonthRepayment}
          onChange={(e) => setNextMonthRepayment(e.target.value)}
        />
      </label>
      {error ? (
        <p className="status status--warning" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={onCancel}
          disabled={pending}
        >
          返回
        </button>
      </div>
    </form>
  );
}
