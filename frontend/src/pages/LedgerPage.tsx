import { useState } from 'react';

import { deleteTransaction } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import type { TransactionRecord, TransactionType } from '../types/api';

interface LedgerPageProps {
  transactions?: TransactionRecord[];
  deleteTransactionImpl?: (id: number) => Promise<void>;
}

type FilterType = 'all' | 'income' | 'expense' | 'transfer' | 'credit';

const CATEGORY_COLORS: Record<string, string> = {
  餐饮: '#e67e22',
  交通: '#3498db',
  购物: '#9b59b6',
  娱乐: '#e74c3c',
  住房: '#1abc9c',
  医疗: '#e84393',
  教育: '#00b894',
  工资: '#27ae60',
  转账: '#2980b9',
  通讯: '#f39c12',
  日用: '#636e72',
  服饰: '#fd79a8',
};

function getCategoryColor(category: string): string {
  if (!category) return '#95a5a6';
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

function getDirectionInfo(type: TransactionType): {
  sign: string;
  className: string;
  label: string;
} {
  switch (type) {
    case 'income':
      return { sign: '+', className: 'ledger-amount--income', label: '收入' };
    case 'expense':
      return { sign: '-', className: 'ledger-amount--expense', label: '支出' };
    case 'credit_spending':
      return { sign: '-', className: 'ledger-amount--expense', label: '信用消费' };
    case 'credit_repayment':
      return { sign: '-', className: 'ledger-amount--transfer', label: '信用还款' };
    case 'transfer':
      return { sign: '↔', className: 'ledger-amount--transfer', label: '转账' };
    case 'credit_transfer':
      return { sign: '↔', className: 'ledger-amount--transfer', label: '信用转账' };
    default:
      return { sign: '', className: '', label: type };
  }
}

function matchesFilter(type: TransactionType, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'income') return type === 'income';
  if (filter === 'expense') return type === 'expense';
  if (filter === 'transfer') return type === 'transfer';
  if (filter === 'credit')
    return type === 'credit_spending' || type === 'credit_repayment' || type === 'credit_transfer';
  return true;
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '收入' },
  { key: 'expense', label: '支出' },
  { key: 'transfer', label: '转账' },
  { key: 'credit', label: '信用卡' },
];

export function LedgerPage({
  transactions,
  deleteTransactionImpl = deleteTransaction,
}: LedgerPageProps) {
  const appData = useAppData();
  const [localTransactions, setLocalTransactions] = useState<TransactionRecord[] | null>(
    transactions ?? null,
  );
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [detailItem, setDetailItem] = useState<TransactionRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TransactionRecord | null>(null);

  const currentTransactions = localTransactions ?? appData.transactions;
  const filtered = currentTransactions.filter((item) => matchesFilter(item.type, filter));

  // Group by date
  const groups: { dateKey: string; dateLabel: string; items: TransactionRecord[] }[] = [];
  let lastDateKey = '';
  for (const item of filtered) {
    const key = getDateKey(item.occurredAt);
    if (key !== lastDateKey) {
      groups.push({ dateKey: key, dateLabel: formatDateGroup(item.occurredAt), items: [] });
      lastDateKey = key;
    }
    groups[groups.length - 1].items.push(item);
  }

  async function handleDelete(id: number) {
    await deleteTransactionImpl(id);
    setLocalTransactions((current) => current?.filter((item) => item.id !== id) ?? []);
    setDeleteConfirm(null);
    setMessage('流水已删除');
    if (!transactions) {
      await appData.reload();
    }
  }

  return (
    <>
      <section className="panel form-grid">
        <div className="panel__header">
          <h2>流水</h2>
          <p>按时间倒序查看每一笔收支与还款。</p>
        </div>

        {/* Filter bar */}
        <div className="ledger-filter">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`ledger-filter__btn${filter === opt.key ? ' ledger-filter__btn--active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="ledger-empty">
            <p className="ledger-empty__icon">📒</p>
            <p className="ledger-empty__title">
              {currentTransactions.length === 0 ? '还没有流水记录' : '没有符合筛选条件的记录'}
            </p>
            <p className="ledger-empty__hint">
              {currentTransactions.length === 0
                ? '去手动记账或 AI 记账添加第一笔吧'
                : '试试切换其他筛选条件'}
            </p>
          </div>
        ) : (
          <ul className="ledger-list">
            {groups.map((group) => (
              <li key={group.dateKey} className="ledger-group">
                <div className="ledger-date-header">{group.dateLabel}</div>
                <ul className="ledger-group__items">
                  {group.items.map((item) => {
                    const dir = getDirectionInfo(item.type);
                    return (
                      <li
                        key={item.id}
                        className="ledger-list__item"
                        onClick={() => setDetailItem(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setDetailItem(item);
                        }}
                      >
                        <div className="ledger-list__left">
                          <div className="ledger-list__title-row">
                            <strong>{item.title}</strong>
                            {item.category ? (
                              <span
                                className="ledger-category-badge"
                                style={{
                                  backgroundColor: getCategoryColor(item.category) + '20',
                                  color: getCategoryColor(item.category),
                                }}
                              >
                                {item.category}
                              </span>
                            ) : null}
                          </div>
                          <p>
                            {dir.label} · {formatDateTime(item.occurredAt)}
                          </p>
                          <p>{item.sourceAccountName || item.targetAccountName}</p>
                        </div>
                        <div className="ledger-list__meta">
                          <span className={`ledger-amount ${dir.className}`}>{dir.sign}</span>
                          <NativeDualCurrencyAmount
                            amount={item.amount}
                            currency={item.currency}
                            rates={appData.settings}
                            align="end"
                          />
                          <button
                            type="button"
                            className="button button--ghost ledger-delete-btn"
                            aria-label={`删除 ${item.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(item);
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {message ? <p className="status">{message}</p> : null}
      </section>

      {/* Detail Modal */}
      {detailItem ? (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{detailItem.title}</h3>
            <div className="modal-detail-grid">
              <div className="modal-detail-row">
                <span className="modal-detail-label">类型</span>
                <span>{getDirectionInfo(detailItem.type).label}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">金额</span>
                <span className={getDirectionInfo(detailItem.type).className}>
                  {getDirectionInfo(detailItem.type).sign}
                  {detailItem.amount} {detailItem.currency === 'JPY' ? '円' : '元'}
                </span>
              </div>
              {detailItem.category ? (
                <div className="modal-detail-row">
                  <span className="modal-detail-label">类别</span>
                  <span
                    className="ledger-category-badge"
                    style={{
                      backgroundColor: getCategoryColor(detailItem.category) + '20',
                      color: getCategoryColor(detailItem.category),
                    }}
                  >
                    {detailItem.category}
                  </span>
                </div>
              ) : null}
              <div className="modal-detail-row">
                <span className="modal-detail-label">时间</span>
                <span>{formatDateTime(detailItem.occurredAt)}</span>
              </div>
              {detailItem.sourceAccountName ? (
                <div className="modal-detail-row">
                  <span className="modal-detail-label">来源账户</span>
                  <span>{detailItem.sourceAccountName}</span>
                </div>
              ) : null}
              {detailItem.targetAccountName ? (
                <div className="modal-detail-row">
                  <span className="modal-detail-label">目标账户</span>
                  <span>{detailItem.targetAccountName}</span>
                </div>
              ) : null}
              {detailItem.note ? (
                <div className="modal-detail-row">
                  <span className="modal-detail-label">备注</span>
                  <span>{detailItem.note}</span>
                </div>
              ) : null}
              {detailItem.origin === 'ai' && detailItem.aiInputText ? (
                <div className="modal-detail-section">
                  <span className="modal-detail-label">AI 原始输入</span>
                  <p className="modal-ai-input">{detailItem.aiInputText}</p>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="button modal-close-btn"
              onClick={() => setDetailItem(null)}
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteConfirm ? (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-content--small" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">确认删除</h3>
            <p className="modal-confirm-text">
              确定要删除「{deleteConfirm.title}」这笔{getDirectionInfo(deleteConfirm.type).label}
              记录吗？
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button button--danger"
                onClick={() => void handleDelete(deleteConfirm.id)}
              >
                确认删除
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
