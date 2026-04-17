import { useMemo, useState } from 'react';

import { deleteTransaction, updateExistingTransaction } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/format';
import { useAppData } from '../hooks/useAppData';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import { BottomSheet } from '../components/BottomSheet';
import { useToast } from '../components/Toast';
import type {
  AccountBalance,
  CreateTransactionInput,
  TransactionRecord,
  TransactionType,
} from '../types/api';

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

function getDirectionInfo(
  type: TransactionType,
  category?: string,
): {
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
      if (category === '找零') {
        return { sign: '⇋', className: 'ledger-amount--transfer', label: '找零' };
      }
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

function matchesSearch(item: TransactionRecord, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.title.toLowerCase().includes(q) ||
    item.note.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    item.sourceAccountName.toLowerCase().includes(q) ||
    item.targetAccountName.toLowerCase().includes(q) ||
    String(item.amount).includes(q)
  );
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

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'transfer', label: '转账' },
  { value: 'credit_spending', label: '信用消费' },
  { value: 'credit_repayment', label: '信用还款' },
  { value: 'credit_transfer', label: '信用充值' },
];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LedgerPage({
  transactions,
  deleteTransactionImpl = deleteTransaction,
}: LedgerPageProps) {
  const appData = useAppData();
  const { toast } = useToast();
  const [localTransactions, setLocalTransactions] = useState<TransactionRecord[] | null>(
    transactions ?? null,
  );
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<TransactionRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TransactionRecord | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');

  const currentTransactions = localTransactions ?? appData.transactions;
  const filtered = currentTransactions
    .filter((item) => matchesFilter(item.type, filter))
    .filter((item) => matchesSearch(item, search));

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
    toast('流水已删除', 'success');
    if (!transactions) {
      await appData.reload();
    }
  }

  const hasActiveFilter = filter !== 'all' || search !== '';

  return (
    <>
      <section className="panel panel--compact">
        {/* Filter/search chip bar */}
        <div className="ledger-bar">
          <button
            type="button"
            className={`ledger-bar__icon${hasActiveFilter ? ' ledger-bar__icon--active' : ''}`}
            aria-label="搜索与筛选"
            onClick={() => setSearchOpen(true)}
          >
            🔍{hasActiveFilter ? <span className="ledger-bar__dot" /> : null}
          </button>
          <div className="ledger-bar__chips">
            {filter !== 'all' ? (
              <span className="ledger-bar__chip" onClick={() => setFilter('all')}>
                {FILTER_OPTIONS.find((f) => f.key === filter)?.label} ✕
              </span>
            ) : null}
            {search ? (
              <span className="ledger-bar__chip" onClick={() => setSearch('')}>
                {`“${search}” ✕`}
              </span>
            ) : null}
          </div>
          <span className="ledger-bar__count">{filtered.length} 笔</span>
        </div>

        {filtered.length === 0 ? (
          <div className="ledger-empty">
            <p className="ledger-empty__icon">📒</p>
            <p className="ledger-empty__title">
              {currentTransactions.length === 0
                ? '还没有流水记录'
                : search
                  ? '没有匹配的搜索结果'
                  : '没有符合筛选条件的记录'}
            </p>
            <p className="ledger-empty__hint">
              {currentTransactions.length === 0
                ? '去手动记账或 AI 记账添加第一笔吧'
                : search
                  ? '试试其他关键词'
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
                    const dir = getDirectionInfo(item.type, item.category);
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
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Search / Filter sheet */}
      <BottomSheet open={searchOpen} onClose={() => setSearchOpen(false)} title="搜索与筛选">
        <div className="form-grid">
          <label className="field">
            <span>搜索关键词</span>
            <input
              type="text"
              placeholder="标题、备注、金额、账户..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </label>
          <div>
            <p className="field__label">类型筛选</p>
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
          </div>
          <div className="form-actions">
            <button type="button" className="button" onClick={() => setSearchOpen(false)}>
              应用
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
            >
              清除
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Detail / Edit Sheet */}
      {detailItem && detailMode === 'edit' ? (
        <EditTransactionModal
          item={detailItem}
          accounts={appData.accounts}
          onSave={async () => {
            setDetailItem(null);
            setDetailMode('view');
            if (!transactions) await appData.reload();
            setLocalTransactions(null);
            toast('修改已保存', 'success');
          }}
          onClose={() => setDetailMode('view')}
        />
      ) : null}

      <BottomSheet
        open={!!detailItem && detailMode === 'view'}
        onClose={() => {
          setDetailItem(null);
          setDetailMode('view');
        }}
        title={detailItem?.title}
      >
        {detailItem ? (
          <>
            <div className="modal-detail-grid">
              <div className="modal-detail-row">
                <span className="modal-detail-label">类型</span>
                <span>{getDirectionInfo(detailItem.type, detailItem.category).label}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">金额</span>
                <span className={getDirectionInfo(detailItem.type, detailItem.category).className}>
                  {getDirectionInfo(detailItem.type, detailItem.category).sign}
                  {formatCurrency(detailItem.amount, detailItem.currency)}
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
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" className="button" onClick={() => setDetailMode('edit')}>
                编辑
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => setDeleteConfirm(detailItem)}
              >
                删除
              </button>
            </div>
          </>
        ) : null}
      </BottomSheet>

      {/* Delete Confirmation Sheet */}
      <BottomSheet open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="确认删除">
        {deleteConfirm ? (
          <>
            <p className="modal-confirm-text">
              确定要删除「{deleteConfirm.title}」这笔
              {getDirectionInfo(deleteConfirm.type, deleteConfirm.category).label}记录吗？
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  void handleDelete(deleteConfirm.id);
                  setDetailItem(null);
                  setDetailMode('view');
                }}
              >
                确认删除
              </button>
            </div>
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}

/* ─── Edit Transaction Modal ─────────────────────────────────────────── */

function EditTransactionModal({
  item,
  accounts,
  onSave,
  onClose,
}: {
  item: TransactionRecord;
  accounts: AccountBalance[];
  onSave: () => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<TransactionType>(item.type);
  const [title, setTitle] = useState(item.title);
  const [amount, setAmount] = useState(String(item.amount));
  const [currency, setCurrency] = useState<'CNY' | 'JPY'>(item.currency);
  const [sourceAccountName, setSourceAccountName] = useState(item.sourceAccountName);
  const [targetAccountName, setTargetAccountName] = useState(item.targetAccountName);
  const [category, setCategory] = useState(item.category);
  const [note, setNote] = useState(item.note);
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocal(item.occurredAt));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const assetAccounts = useMemo(() => accounts.filter((a) => a.kind === 'asset'), [accounts]);
  const liabilityAccounts = useMemo(
    () => accounts.filter((a) => a.kind === 'liability'),
    [accounts],
  );

  const needsSource =
    type === 'expense' ||
    type === 'transfer' ||
    type === 'credit_repayment' ||
    type === 'credit_transfer';
  const needsTarget =
    type === 'income' ||
    type === 'transfer' ||
    type === 'credit_spending' ||
    type === 'credit_repayment' ||
    type === 'credit_transfer';

  async function handleSave() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('金额必须大于 0');
      return;
    }
    const parsed = new Date(occurredAt);
    const isoTime = Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();

    const input: CreateTransactionInput = {
      type,
      title: title || '未命名',
      amount: parsedAmount,
      currency,
      category,
      note,
      occurredAt: isoTime,
      origin: item.origin,
      aiInputText: item.aiInputText,
    };
    if (needsSource) input.sourceAccountName = sourceAccountName;
    if (needsTarget) input.targetAccountName = targetAccountName;

    setPending(true);
    setError('');
    try {
      await updateExistingTransaction(item.id, input);
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="编辑交易" locked={pending}>
      <div className="form-grid">
        <label className="field">
          <span>类型</span>
          <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>标题</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="editable-draft__row">
          <label className="field" style={{ flex: 2 }}>
            <span>金额</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>币种</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as 'CNY' | 'JPY')}>
              <option value="CNY">人民币</option>
              <option value="JPY">日元</option>
            </select>
          </label>
        </div>
        {needsSource ? (
          <label className="field">
            <span>{type === 'credit_transfer' ? '信用账户' : '支付账户'}</span>
            <select
              value={sourceAccountName}
              onChange={(e) => setSourceAccountName(e.target.value)}
            >
              <option value="">请选择</option>
              {(type === 'credit_transfer' ? liabilityAccounts : assetAccounts).map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {needsTarget ? (
          <label className="field">
            <span>
              {type === 'income'
                ? '入账账户'
                : type === 'credit_spending'
                  ? '信用账户'
                  : '目标账户'}
            </span>
            <select
              value={targetAccountName}
              onChange={(e) => setTargetAccountName(e.target.value)}
            >
              <option value="">请选择</option>
              {(type === 'credit_spending' || type === 'credit_repayment'
                ? liabilityAccounts
                : assetAccounts
              ).map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>分类</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="field">
          <span>时间</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </label>
        <label className="field">
          <span>备注</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error ? <p className="status status--warning">{error}</p> : null}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => void handleSave()}
          >
            {pending ? '保存中...' : '保存修改'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
            disabled={pending}
          >
            取消
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
