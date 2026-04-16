import { useState, type FormEvent } from 'react';

import { updateAccountDetails, updateAccountInitialBalance } from '../lib/api';
import { formatCurrency, type ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { AccountBalance, Currency } from '../types/api';

interface AccountBalanceListProps {
  accounts: AccountBalance[];
  rates: ExchangeRates;
  onAccountUpdated?: () => void | Promise<void>;
  onAccountClick?: (accountName: string) => void;
  updateInitialBalanceImpl?: (id: number, initialBalance: number) => Promise<void>;
  updateAccountDetailsImpl?: (
    id: number,
    patch: Partial<{
      initialBalance: number;
      creditLimit: number;
      monthlyBillingDay: number;
      paymentDueDay: number;
      nextMonthRepayment: number;
    }>,
  ) => Promise<void>;
}

interface EditDraft {
  initialBalance: string;
  creditLimit: string;
  monthlyBillingDay: string;
  paymentDueDay: string;
  nextMonthRepayment: string;
}

function makeDraft(account: AccountBalance): EditDraft {
  return {
    initialBalance: String(account.initialBalance),
    creditLimit: String(account.creditLimit ?? 0),
    monthlyBillingDay: account.monthlyBillingDay ? String(account.monthlyBillingDay) : '',
    paymentDueDay: account.paymentDueDay ? String(account.paymentDueDay) : '',
    nextMonthRepayment: account.nextMonthRepayment ? String(account.nextMonthRepayment) : '',
  };
}

function CreditUsageBar({
  balance,
  limit,
  currency,
}: {
  balance: number;
  limit: number;
  currency: Currency;
}) {
  if (limit <= 0) return null;
  const usagePct = Math.min(Math.round((balance / limit) * 100), 100);
  const available = limit - balance;
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
          已用 <strong>{formatCurrency(balance, currency)}</strong>
        </span>
        <span>额度 {formatCurrency(limit, currency)}</span>
      </div>
      <p className="credit-usage__available">
        可用 <strong>{formatCurrency(available, currency)}</strong>
      </p>
    </div>
  );
}

function CreditDateInfo({
  account,
}: {
  account: Pick<
    AccountBalance,
    'monthlyBillingDay' | 'paymentDueDay' | 'nextMonthRepayment' | 'currency'
  >;
}) {
  const { monthlyBillingDay, paymentDueDay, nextMonthRepayment, currency } = account;
  if (!monthlyBillingDay && !paymentDueDay && !nextMonthRepayment) return null;

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

export function AccountBalanceList({
  accounts,
  rates,
  onAccountUpdated,
  onAccountClick,
  updateInitialBalanceImpl = updateAccountInitialBalance,
  updateAccountDetailsImpl = updateAccountDetails,
}: AccountBalanceListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    initialBalance: '',
    creditLimit: '',
    monthlyBillingDay: '',
    paymentDueDay: '',
    nextMonthRepayment: '',
  });
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  function startEdit(account: AccountBalance) {
    setEditingId(account.id);
    setDraft(makeDraft(account));
    setErrorMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setErrorMessage('');
  }

  function setField(key: keyof EditDraft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function parseDayField(raw: string, label: string): number | undefined {
    if (!raw) return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      throw new Error(`${label}请填 1-31 之间的整数`);
    }
    return n;
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, account: AccountBalance) {
    event.preventDefault();
    const parsedBalance = Number(draft.initialBalance);
    if (!Number.isFinite(parsedBalance)) {
      setErrorMessage('请输入有效数字');
      return;
    }

    setPendingId(account.id);
    setErrorMessage('');
    try {
      if (account.kind === 'liability') {
        const parsedLimit = Number(draft.creditLimit);
        const parsedBillingDay = parseDayField(draft.monthlyBillingDay, '账单日');
        const parsedPaymentDay = parseDayField(draft.paymentDueDay, '还款截止日');
        const parsedNext = draft.nextMonthRepayment ? Number(draft.nextMonthRepayment) : undefined;
        await updateAccountDetailsImpl(account.id, {
          initialBalance: parsedBalance,
          creditLimit: Number.isFinite(parsedLimit) ? parsedLimit : 0,
          ...(parsedBillingDay !== undefined ? { monthlyBillingDay: parsedBillingDay } : {}),
          ...(parsedPaymentDay !== undefined ? { paymentDueDay: parsedPaymentDay } : {}),
          ...(parsedNext !== undefined ? { nextMonthRepayment: parsedNext } : {}),
        });
      } else {
        await updateInitialBalanceImpl(account.id, parsedBalance);
      }
      setEditingId(null);
      await onAccountUpdated?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '更新失败');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ul className="account-list">
      {accounts.map((account) => {
        const isEditing = editingId === account.id;
        const isPending = pendingId === account.id;
        const isCredit = account.kind === 'liability';

        return (
          <li
            key={account.id}
            className={`account-list__item${isCredit ? ' account-list__item--credit' : ''}`}
          >
            <div className="account-list__header">
              <div className="account-list__title-row">
                <strong
                  className={`account-list__name${onAccountClick ? ' account-list__name--clickable' : ''}`}
                  onClick={onAccountClick ? () => onAccountClick(account.name) : undefined}
                  role={onAccountClick ? 'button' : undefined}
                  tabIndex={onAccountClick ? 0 : undefined}
                  onKeyDown={onAccountClick ? (e) => { if (e.key === 'Enter') onAccountClick(account.name); } : undefined}
                >
                  {account.name}
                </strong>
                {isCredit ? <span className="account-badge">信用卡</span> : null}
              </div>

              {isCredit ? (
                <div className="account-list__credit-body">
                  {account.balance > 0 ? (
                    <CreditUsageBar
                      balance={account.balance}
                      limit={account.creditLimit}
                      currency={account.currency}
                    />
                  ) : (
                    <p className="account-list__no-debt">
                      暂无欠款
                      {account.creditLimit > 0
                        ? `（额度 ${formatCurrency(account.creditLimit, account.currency)}）`
                        : null}
                    </p>
                  )}
                  <CreditDateInfo account={account} />
                </div>
              ) : (
                <p className="account-list__sub">
                  {account.currency === 'JPY' ? '日元账户' : '人民币账户'} · 初始{' '}
                  {formatCurrency(account.initialBalance, account.currency)}
                </p>
              )}

              {isEditing ? (
                <form
                  className="account-list__editor"
                  onSubmit={(event) => void submitEdit(event, account)}
                >
                  <label className="field">
                    <span>初始余额（{account.currency}）</span>
                    <input
                      aria-label={`${account.name} 初始金额`}
                      type="number"
                      step="0.01"
                      value={draft.initialBalance}
                      onChange={(e) => setField('initialBalance', e.target.value)}
                      autoFocus
                    />
                  </label>
                  {isCredit ? (
                    <>
                      <label className="field">
                        <span>信用额度（{account.currency}）</span>
                        <input
                          aria-label={`${account.name} 每月额度`}
                          type="number"
                          step="1"
                          value={draft.creditLimit}
                          onChange={(e) => setField('creditLimit', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>账单日（每月第几日，留空未设置）</span>
                        <input
                          aria-label={`${account.name} 还款日`}
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          placeholder="如 15"
                          value={draft.monthlyBillingDay}
                          onChange={(e) => setField('monthlyBillingDay', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>还款截止日（次月第几日，留空未设置）</span>
                        <input
                          aria-label={`${account.name} 还款截止日`}
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          placeholder="如 10"
                          value={draft.paymentDueDay}
                          onChange={(e) => setField('paymentDueDay', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>下次应还金额（{account.currency}，留空未设置）</span>
                        <input
                          aria-label={`${account.name} 下月需还款`}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={draft.nextMonthRepayment}
                          onChange={(e) => setField('nextMonthRepayment', e.target.value)}
                        />
                      </label>
                    </>
                  ) : null}
                  <div className="form-actions">
                    <button type="submit" className="button" disabled={isPending}>
                      {isPending ? '保存中…' : '保存'}
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={cancelEdit}
                      disabled={isPending}
                    >
                      取消
                    </button>
                  </div>
                  {errorMessage ? (
                    <p className="status status--warning" role="alert">
                      {errorMessage}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>

            {!isCredit ? (
              <div className="account-list__amount-col">
                <NativeDualCurrencyAmount
                  amount={account.balance}
                  currency={account.currency}
                  rates={rates}
                  align="end"
                />
                {!isEditing ? (
                  <button
                    type="button"
                    className="button button--ghost account-list__edit"
                    onClick={() => startEdit(account)}
                  >
                    编辑初始
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="account-list__credit-actions">
                {!isEditing ? (
                  <button
                    type="button"
                    className="button button--ghost account-list__edit"
                    onClick={() => startEdit(account)}
                  >
                    编辑信息
                  </button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
