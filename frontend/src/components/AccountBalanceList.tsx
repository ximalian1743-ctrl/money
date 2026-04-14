import { useState, type FormEvent } from 'react';

import { updateAccountInitialBalance } from '../lib/api';
import type { ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { AccountBalance } from '../types/api';

interface AccountBalanceListProps {
  accounts: AccountBalance[];
  rates: ExchangeRates;
  onAccountUpdated?: () => void | Promise<void>;
  updateInitialBalanceImpl?: (id: number, initialBalance: number) => Promise<void>;
}

export function AccountBalanceList({
  accounts,
  rates,
  onAccountUpdated,
  updateInitialBalanceImpl = updateAccountInitialBalance,
}: AccountBalanceListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  function startEdit(account: AccountBalance) {
    setEditingId(account.id);
    setDraftValue(String(account.initialBalance));
    setErrorMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftValue('');
    setErrorMessage('');
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, account: AccountBalance) {
    event.preventDefault();
    const parsed = Number(draftValue);
    if (!Number.isFinite(parsed)) {
      setErrorMessage('请输入有效数字');
      return;
    }

    setPendingId(account.id);
    setErrorMessage('');
    try {
      await updateInitialBalanceImpl(account.id, parsed);
      setEditingId(null);
      setDraftValue('');
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
        return (
          <li key={account.id} className="account-list__item">
            <div className="account-list__info">
              <strong>{account.name}</strong>
              <p>
                {account.kind === 'liability' ? '欠款账户' : '资产账户'} · 初始{' '}
                {account.initialBalance.toLocaleString()}
              </p>
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
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      autoFocus
                    />
                  </label>
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
                  编辑初始
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
