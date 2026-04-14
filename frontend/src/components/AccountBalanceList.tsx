import { useState, type FormEvent } from 'react';

import { updateAccountDetails, updateAccountInitialBalance } from '../lib/api';
import { formatCurrency, type ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { AccountBalance } from '../types/api';

interface AccountBalanceListProps {
  accounts: AccountBalance[];
  rates: ExchangeRates;
  onAccountUpdated?: () => void | Promise<void>;
  updateInitialBalanceImpl?: (id: number, initialBalance: number) => Promise<void>;
  updateAccountDetailsImpl?: (
    id: number,
    patch: Partial<{
      initialBalance: number;
      creditLimit: number;
      monthlyBillingDay: number;
      nextMonthRepayment: number;
      monthAfterNextRepayment: number;
    }>,
  ) => Promise<void>;
}

interface EditDraft {
  initialBalance: string;
  creditLimit: string;
  monthlyBillingDay: string;
  nextMonthRepayment: string;
  monthAfterNextRepayment: string;
}

function makeDraft(account: AccountBalance): EditDraft {
  return {
    initialBalance: String(account.initialBalance),
    creditLimit: String(account.creditLimit ?? 0),
    monthlyBillingDay: String(account.monthlyBillingDay ?? ''),
    nextMonthRepayment: String(account.nextMonthRepayment ?? ''),
    monthAfterNextRepayment: String(account.monthAfterNextRepayment ?? ''),
  };
}

export function AccountBalanceList({
  accounts,
  rates,
  onAccountUpdated,
  updateInitialBalanceImpl = updateAccountInitialBalance,
  updateAccountDetailsImpl = updateAccountDetails,
}: AccountBalanceListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    initialBalance: '',
    creditLimit: '',
    monthlyBillingDay: '',
    nextMonthRepayment: '',
    monthAfterNextRepayment: '',
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
        const parsedDay = draft.monthlyBillingDay ? Number(draft.monthlyBillingDay) : undefined;
        const parsedNext = draft.nextMonthRepayment ? Number(draft.nextMonthRepayment) : undefined;
        const parsedAfter = draft.monthAfterNextRepayment
          ? Number(draft.monthAfterNextRepayment)
          : undefined;
        if (parsedDay !== undefined && (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)) {
          setErrorMessage('还款日请填 1-31 之间的整数');
          return;
        }
        await updateAccountDetailsImpl(account.id, {
          initialBalance: parsedBalance,
          creditLimit: Number.isFinite(parsedLimit) ? parsedLimit : 0,
          ...(parsedDay !== undefined ? { monthlyBillingDay: parsedDay } : {}),
          ...(parsedNext !== undefined ? { nextMonthRepayment: parsedNext } : {}),
          ...(parsedAfter !== undefined ? { monthAfterNextRepayment: parsedAfter } : {}),
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
          <li key={account.id} className="account-list__item">
            <div className="account-list__info">
              <strong>{account.name}</strong>
              <p>
                {isCredit ? '欠款账户' : '资产账户'} · 初始{' '}
                {formatCurrency(account.initialBalance, account.currency)}
                {isCredit && account.creditLimit > 0
                  ? ` · 额度 ${formatCurrency(account.creditLimit, account.currency)}`
                  : null}
              </p>
              {isCredit && (account.monthlyBillingDay || account.nextMonthRepayment !== undefined || account.monthAfterNextRepayment !== undefined) ? (
                <p>
                  {account.monthlyBillingDay ? `还款日 每月${account.monthlyBillingDay}号` : null}
                  {account.monthlyBillingDay && (account.nextMonthRepayment !== undefined || account.monthAfterNextRepayment !== undefined) ? ' · ' : null}
                  {account.nextMonthRepayment !== undefined
                    ? `下月 ${formatCurrency(account.nextMonthRepayment, account.currency)}`
                    : null}
                  {account.nextMonthRepayment !== undefined && account.monthAfterNextRepayment !== undefined ? ' / ' : null}
                  {account.monthAfterNextRepayment !== undefined
                    ? `下下月 ${formatCurrency(account.monthAfterNextRepayment, account.currency)}`
                    : null}
                </p>
              ) : null}
              {isEditing ? (
                <form
                  className="account-list__editor"
                  onSubmit={(event) => void submitEdit(event, account)}
                >
                  <label className="field">
                    <span>初始金额 ({account.currency})</span>
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
                        <span>每月额度 ({account.currency})</span>
                        <input
                          aria-label={`${account.name} 每月额度`}
                          type="number"
                          step="1"
                          value={draft.creditLimit}
                          onChange={(e) => setField('creditLimit', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>每月还款日（1–31，留空表示未设置）</span>
                        <input
                          aria-label={`${account.name} 还款日`}
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          placeholder="例如 15"
                          value={draft.monthlyBillingDay}
                          onChange={(e) => setField('monthlyBillingDay', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>下个月需还款 ({account.currency}，留空表示未设置)</span>
                        <input
                          aria-label={`${account.name} 下月需还款`}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={draft.nextMonthRepayment}
                          onChange={(e) => setField('nextMonthRepayment', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>下下个月需还款 ({account.currency}，留空表示未设置)</span>
                        <input
                          aria-label={`${account.name} 下下月需还款`}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={draft.monthAfterNextRepayment}
                          onChange={(e) => setField('monthAfterNextRepayment', e.target.value)}
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
            <div className="account-list__actions">
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
                  {isCredit ? '编辑信息' : '编辑初始'}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
