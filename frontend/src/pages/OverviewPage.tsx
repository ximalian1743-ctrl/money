import { useMemo, useState } from 'react';

import { createTransaction } from '../lib/api';
import { AccountBalanceList } from '../components/AccountBalanceList';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import { SummaryCard } from '../components/SummaryCard';
import { QuickEntryModal, type QuickEntryTemplate } from '../components/QuickEntryModal';
import { WalletDetailModal } from '../components/WalletDetailModal';
import { formatCurrency } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import type { AccountBalance, CreateTransactionInput, TransactionRecord } from '../types/api';

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
    .slice(0, 6)
    .map((t) => t.template);
}

export function OverviewPage() {
  const { accounts, summary, settings, transactions, error, reload } = useAppData();
  const netJpy = summary.assetsInJpy - summary.totalLiabilitiesJpy;
  const quickTemplates = useMemo(() => computeQuickTemplates(transactions), [transactions]);

  const [activeWallet, setActiveWallet] = useState<AccountBalance | null>(null);
  const [activeQuickTpl, setActiveQuickTpl] = useState<QuickEntryTemplate | null>(null);
  const [message, setMessage] = useState('');

  function openWallet(accountName: string) {
    const acc = accounts.find((a) => a.name === accountName);
    if (acc) setActiveWallet(acc);
  }

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
    setMessage(`已记录: ${input.title} ${formatCurrency(input.amount, input.currency)}`);
    setTimeout(() => setMessage(''), 3000);
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

      {/* Credit card debt */}
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

      {/* Quick entry buttons */}
      {quickTemplates.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <h2>快捷记账</h2>
            <p>点击高频模板，输入金额即可一键记账。</p>
          </div>
          <div className="quick-entry-grid">
            {quickTemplates.map((t) => (
              <button
                key={`${t.title}-${t.accountName}`}
                type="button"
                className="quick-entry-btn"
                onClick={() => setActiveQuickTpl(t)}
              >
                <span className="quick-entry-btn__title">{t.title}</span>
                <span className="quick-entry-btn__sub">
                  {t.accountName} · {t.category || '未分类'}
                </span>
              </button>
            ))}
          </div>
          {message ? <p className="status">{message}</p> : null}
        </section>
      ) : null}

      {/* Account list — compact */}
      <section className="panel">
        <div className="panel__header">
          <h2>账户余额</h2>
          <p>点击账户查看动账、调整余额或编辑卡片信息。</p>
        </div>
        <AccountBalanceList accounts={accounts} rates={settings} onAccountClick={openWallet} />
      </section>

      {error ? <p className="status status--warning">当前展示的是离线占位数据：{error}</p> : null}

      {/* Wallet detail modal */}
      {activeWallet ? (
        <WalletDetailModal
          account={activeWallet}
          recentTransactions={walletTransactions}
          rates={settings}
          onClose={() => setActiveWallet(null)}
          onRefresh={reload}
        />
      ) : null}

      {/* Quick entry modal */}
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
