import { useState } from 'react';

import { AccountBalanceList } from '../components/AccountBalanceList';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import { SummaryCard } from '../components/SummaryCard';
import { formatCurrency, formatDateTime } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import type { TransactionRecord, TransactionType } from '../types/api';

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

export function OverviewPage() {
  const { accounts, summary, settings, transactions, error, reload } = useAppData();
  const netJpy = summary.assetsInJpy - summary.totalLiabilitiesJpy;
  const recentTransactions = transactions.slice(0, 5);

  const [walletDetail, setWalletDetail] = useState<{
    name: string;
    items: TransactionRecord[];
  } | null>(null);

  function handleAccountClick(accountName: string) {
    const related = transactions.filter(
      (t) => t.sourceAccountName === accountName || t.targetAccountName === accountName,
    ).slice(0, 10);
    setWalletDetail({ name: accountName, items: related });
  }

  return (
    <section className="stack">
      {/* Hero: Net Worth */}
      <article className="summary-hero">
        <p className="summary-hero__label">净资产</p>
        <strong className="summary-hero__primary">
          {formatCurrency(summary.actualBalanceCnyBase, 'CNY')}
        </strong>
        <p className="summary-hero__sub">{formatCurrency(netJpy, 'JPY')}</p>
      </article>

      {/* Asset breakdown */}
      <div className="card-grid">
        <SummaryCard
          label="人民币资产"
          value={
            <NativeDualCurrencyAmount
              amount={summary.cnyAssetTotal}
              currency="CNY"
              rates={settings}
            />
          }
        />
        <SummaryCard
          label="日元资产"
          value={
            <NativeDualCurrencyAmount
              amount={summary.jpyAssetTotal}
              currency="JPY"
              rates={settings}
            />
          }
          tone="accent"
        />
      </div>

      {/* Credit card debt — shown only when non-zero */}
      {summary.totalLiabilitiesJpy > 0 ? (
        <SummaryCard
          label="信用卡欠款"
          value={
            <NativeDualCurrencyAmount
              amount={summary.totalLiabilitiesJpy}
              currency="JPY"
              rates={settings}
            />
          }
          tone="danger"
        />
      ) : null}

      {/* Account list */}
      <section className="panel">
        <div className="panel__header">
          <h2>账户余额</h2>
          <p>点击账户名查看最近动账，点击编辑按钮修改设置。</p>
        </div>
        <AccountBalanceList
          accounts={accounts}
          rates={settings}
          onAccountUpdated={reload}
          onAccountClick={handleAccountClick}
        />
      </section>

      {/* Recent transactions */}
      {recentTransactions.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <h2>最近动账</h2>
          </div>
          <ul className="recent-tx-list">
            {recentTransactions.map((item) => {
              const dir = getDirectionSign(item.type);
              return (
                <li key={item.id} className="recent-tx-item">
                  <div className="recent-tx-item__left">
                    <strong>{item.title}</strong>
                    <span className="recent-tx-item__time">{formatDateTime(item.occurredAt)}</span>
                  </div>
                  <span className={`recent-tx-item__amount ${dir.className}`}>
                    {dir.sign}{formatCurrency(item.amount, item.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {error ? <p className="status status--warning">当前展示的是离线占位数据：{error}</p> : null}

      {/* Wallet detail modal */}
      {walletDetail ? (
        <div className="modal-overlay" onClick={() => setWalletDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{walletDetail.name} — 最近动账</h3>
            {walletDetail.items.length === 0 ? (
              <p className="modal-confirm-text">暂无相关交易记录</p>
            ) : (
              <ul className="recent-tx-list">
                {walletDetail.items.map((item) => {
                  const dir = getDirectionSign(item.type);
                  return (
                    <li key={item.id} className="recent-tx-item">
                      <div className="recent-tx-item__left">
                        <strong>{item.title}</strong>
                        <span className="recent-tx-item__time">{formatDateTime(item.occurredAt)}</span>
                      </div>
                      <span className={`recent-tx-item__amount ${dir.className}`}>
                        {dir.sign}{formatCurrency(item.amount, item.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" className="button modal-close-btn" onClick={() => setWalletDetail(null)}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
