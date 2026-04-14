import { useState } from 'react';

import { deleteTransaction } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import type { TransactionRecord } from '../types/api';

interface LedgerPageProps {
  transactions?: TransactionRecord[];
  deleteTransactionImpl?: (id: number) => Promise<void>;
}

export function LedgerPage({
  transactions,
  deleteTransactionImpl = deleteTransaction
}: LedgerPageProps) {
  const appData = useAppData();
  const [localTransactions, setLocalTransactions] = useState<TransactionRecord[] | null>(
    transactions ?? null
  );
  const [message, setMessage] = useState('');

  const currentTransactions = localTransactions ?? appData.transactions;

  async function handleDelete(id: number) {
    await deleteTransactionImpl(id);
    setLocalTransactions((current) => current?.filter((item) => item.id !== id) ?? []);
    setMessage('流水已删除');
    if (!transactions) {
      await appData.reload();
    }
  }

  return (
    <section className="panel form-grid">
      <div className="panel__header">
        <h2>流水</h2>
        <p>按时间倒序查看每一笔收支与还款。</p>
      </div>

      {currentTransactions.length === 0 ? (
        <p className="status">还没有流水记录。</p>
      ) : (
        <ul className="ledger-list">
          {currentTransactions.map((item) => (
            <li key={item.id} className="ledger-list__item">
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.type} · {formatDateTime(item.occurredAt)}
                </p>
                <p>
                  {item.sourceAccountName || item.targetAccountName}
                </p>
              </div>
              <div className="ledger-list__meta">
                <NativeDualCurrencyAmount
                  amount={item.amount}
                  currency={item.currency}
                  rates={appData.settings}
                  align="end"
                />
                <button
                  type="button"
                  className="button button--ghost"
                  aria-label={`删除 ${item.title}`}
                  onClick={() => void handleDelete(item.id)}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message ? <p className="status">{message}</p> : null}
    </section>
  );
}
