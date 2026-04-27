import { useMemo, useState } from 'react';

import { createTransaction } from '../lib/api';
import { QuickEntryModal, type QuickEntryTemplate } from '../components/QuickEntryModal';
import { WalletDetailModal } from '../components/WalletDetailModal';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import type { AccountBalance, CreateTransactionInput, TransactionRecord } from '../types/api';
import { getAccountIcon, groupAccounts } from '../lib/account-meta';

function computeQuickTemplates(transactions: TransactionRecord[]): QuickEntryTemplate[] {
  const map = new Map<string, { template: QuickEntryTemplate; count: number }>();
  for (const t of transactions) {
    if (t.type !== 'expense' && t.type !== 'credit_spending') continue;
    const key = `${t.title}|${t.type}|${t.sourceAccountName || t.targetAccountName}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        template: {
          title: t.title,
          type: t.type,
          category: t.category,
          accountName: t.sourceAccountName || t.targetAccountName,
          currency: t.currency,
        },
        count: 1,
      });
    }
  }
  return Array.from(map.values())
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((t) => t.template);
}

export function OverviewPage() {
  const { accounts, summary, settings, transactions, error, reload } = useAppData();
  const netJpy = summary.assetsInJpy - summary.totalLiabilitiesJpy;
  const quickTemplates = useMemo(() => computeQuickTemplates(transactions), [transactions]);
  const grouped = useMemo(() => groupAccounts(accounts), [accounts]);
  const { toast } = useToast();

  const [activeWallet, setActiveWallet] = useState<AccountBalance | null>(null);
  const [activeQuickTpl, setActiveQuickTpl] = useState<QuickEntryTemplate | null>(null);

  const walletTransactions = useMemo(() => {
    if (!activeWallet) return [];
    return transactions.filter(
      (t) => t.sourceAccountName === activeWallet.name || t.targetAccountName === activeWallet.name,
    );
  }, [activeWallet, transactions]);

  async function handleQuickSubmit(input: CreateTransactionInput) {
    await createTransaction(input);
    await reload();
    setActiveQuickTpl(null);
    toast(`已记录: ${input.title} ${formatCurrency(input.amount, input.currency)}`, 'success');
  }

  return (
    <section className="stack">
      <article className="wealth-card">
        <div className="wealth-card__main">
          <p className="wealth-card__label">净资产</p>
          <strong className="wealth-card__primary">
            {formatCurrency(summary.actualBalanceCnyBase, 'CNY')}
          </strong>
          <p className="wealth-card__sub">{formatCurrency(netJpy, 'JPY')}</p>
        </div>
        <div className="wealth-card__breakdown">
          <div className="wealth-card__item">
            <span className="wealth-card__item-label">人民币</span>
            <span className="wealth-card__item-value">
              {formatCurrency(summary.cnyAssetTotal, 'CNY')}
            </span>
          </div>
          <div className="wealth-card__item">
            <span className="wealth-card__item-label">日元</span>
            <span className="wealth-card__item-value">
              {formatCurrency(summary.jpyAssetTotal, 'JPY')}
            </span>
          </div>
          {summary.totalLiabilitiesJpy > 0 ? (
            <div className="wealth-card__item wealth-card__item--danger">
              <span className="wealth-card__item-label">欠款</span>
              <span className="wealth-card__item-value">
                {formatCurrency(summary.totalLiabilitiesJpy, 'JPY')}
              </span>
            </div>
          ) : null}
        </div>
      </article>

      {quickTemplates.length > 0 ? (
        <div className="quick-chips-wrapper">
          <p className="section-title">快捷记账</p>
          <div className="quick-chips">
            {quickTemplates.map((t) => (
              <button
                key={`${t.title}-${t.accountName}`}
                type="button"
                className="quick-chip"
                onClick={() => setActiveQuickTpl(t)}
              >
                <div className="quick-chip__icon">⚡️</div>
                <div className="quick-chip__text">
                  <span className="quick-chip__title">{t.title}</span>
                  <span className="quick-chip__sub">{t.accountName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="account-groups-container">
        {grouped.map(({ group, items }) => (
          <div key={group} className="account-group">
            <p className="account-group__title">{group}</p>
            <div className="panel panel--flush">
              <ul className="account-list">
                {items.map((acc) => (
                  <li
                    key={acc.id}
                    className={`account-row${acc.kind === 'liability' ? ' account-row--credit' : ''}`}
                    onClick={() => setActiveWallet(acc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveWallet(acc);
                    }}
                  >
                    <span className="account-row__icon" aria-hidden>
                      {getAccountIcon(acc)}
                    </span>
                    <div className="account-row__content">
                      <span className="account-row__name">{acc.name}</span>
                      <span className="account-row__balance">
                        {acc.kind === 'liability' && acc.balance === 0 ? (
                          <span className="account-row__muted">无欠款</span>
                        ) : (
                          formatCurrency(acc.balance, acc.currency)
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="status status--warning">当前展示的是离线占位数据：{error}</p> : null}

      {/* Wallet detail sheet */}
      {activeWallet ? (
        <WalletDetailModal
          account={activeWallet}
          recentTransactions={walletTransactions}
          rates={settings}
          onClose={() => setActiveWallet(null)}
          onRefresh={reload}
        />
      ) : null}

      {/* Quick entry sheet */}
      {activeQuickTpl ? (
        <QuickEntryModal
          template={activeQuickTpl}
          onClose={() => setActiveQuickTpl(null)}
          onSubmit={handleQuickSubmit}
        />
      ) : null}
    </section>
  );
}
