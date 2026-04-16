import { useMemo, useState } from 'react';

import { createTransaction } from '../lib/api';
import { AccountBalanceList } from '../components/AccountBalanceList';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import { SummaryCard } from '../components/SummaryCard';
import { formatCurrency, formatDateTime } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import type { CreateTransactionInput, TransactionRecord, TransactionType } from '../types/api';

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

interface QuickTemplate {
  title: string;
  type: TransactionType;
  category: string;
  accountName: string;
  currency: 'CNY' | 'JPY';
  count: number;
}

function computeQuickTemplates(transactions: TransactionRecord[]): QuickTemplate[] {
  const map = new Map<string, QuickTemplate>();
  for (const t of transactions) {
    if (t.type !== 'expense' && t.type !== 'credit_spending') continue;
    const key = `${t.title}|${t.type}|${t.sourceAccountName || t.targetAccountName}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        title: t.title,
        type: t.type,
        category: t.category,
        accountName: t.sourceAccountName || t.targetAccountName,
        currency: t.currency,
        count: 1,
      });
    }
  }
  return Array.from(map.values())
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function OverviewPage() {
  const { accounts, summary, settings, transactions, error, reload } = useAppData();
  const netJpy = summary.assetsInJpy - summary.totalLiabilitiesJpy;
  const recentTransactions = transactions.slice(0, 5);

  const quickTemplates = useMemo(() => computeQuickTemplates(transactions), [transactions]);

  const [walletDetail, setWalletDetail] = useState<{
    name: string;
    items: TransactionRecord[];
  } | null>(null);
  const [quickMessage, setQuickMessage] = useState('');

  function handleAccountClick(accountName: string) {
    const related = transactions
      .filter((t) => t.sourceAccountName === accountName || t.targetAccountName === accountName)
      .slice(0, 10);
    setWalletDetail({ name: accountName, items: related });
  }

  async function handleQuickEntry(template: QuickTemplate) {
    const input: CreateTransactionInput = {
      type: template.type,
      title: template.title,
      amount: 0,
      currency: template.currency,
      category: template.category,
      occurredAt: new Date().toISOString(),
      origin: 'manual',
    };
    if (template.type === 'expense') {
      input.sourceAccountName = template.accountName;
    } else if (template.type === 'credit_spending') {
      input.targetAccountName = template.accountName;
    }

    // Quick entry prompts for amount
    const amountStr = window.prompt(
      `${template.title} — 输入金额（${template.currency === 'JPY' ? '円' : '元'}）`,
    );
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      setQuickMessage('金额无效');
      return;
    }
    input.amount = amount;

    try {
      await createTransaction(input);
      await reload();
      setQuickMessage(`已记录: ${template.title} ${formatCurrency(amount, template.currency)}`);
      setTimeout(() => setQuickMessage(''), 3000);
    } catch (err) {
      setQuickMessage(err instanceof Error ? err.message : '记录失败');
    }
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
            <p>根据历史高频交易生成，点击后输入金额即可。</p>
          </div>
          <div className="quick-entry-grid">
            {quickTemplates.map((t) => (
              <button
                key={`${t.title}-${t.accountName}`}
                type="button"
                className="quick-entry-btn"
                onClick={() => void handleQuickEntry(t)}
              >
                <span className="quick-entry-btn__title">{t.title}</span>
                <span className="quick-entry-btn__sub">
                  {t.accountName} · {t.category || '未分类'}
                </span>
              </button>
            ))}
          </div>
          {quickMessage ? <p className="status">{quickMessage}</p> : null}
        </section>
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
                    {dir.sign}
                    {formatCurrency(item.amount, item.currency)}
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
            <button
              type="button"
              className="button modal-close-btn"
              onClick={() => setWalletDetail(null)}
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
