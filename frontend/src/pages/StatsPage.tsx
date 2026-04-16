import { useMemo, useRef, useState } from 'react';

import { formatCurrency } from '../lib/format';
import { transactionsToCsv, downloadCsv } from '../lib/export';
import { useAppData } from '../hooks/useAppData';
import type { TransactionRecord } from '../types/api';

const BUDGET_STORAGE_KEY = 'money-record:budgets';

interface BudgetMap {
  [category: string]: number;
}

function loadBudgets(): BudgetMap {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BudgetMap) : {};
  } catch {
    return {};
  }
}

function saveBudgets(budgets: BudgetMap) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${y}年${Number(m)}月`;
}

function getAvailableMonths(transactions: TransactionRecord[]): string[] {
  const months = new Set<string>();
  for (const t of transactions) {
    const d = new Date(t.occurredAt);
    if (!Number.isNaN(d.getTime())) months.add(getMonthKey(d));
  }
  return Array.from(months).sort().reverse();
}

function filterByMonth(transactions: TransactionRecord[], monthKey: string): TransactionRecord[] {
  return transactions.filter((t) => {
    const d = new Date(t.occurredAt);
    return !Number.isNaN(d.getTime()) && getMonthKey(d) === monthKey;
  });
}

interface CategoryStat {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

function computeCategoryStats(
  transactions: TransactionRecord[],
  type: 'expense' | 'income',
): CategoryStat[] {
  const map = new Map<string, { total: number; count: number }>();
  let grandTotal = 0;
  for (const t of transactions) {
    const isExpense = type === 'expense' && (t.type === 'expense' || t.type === 'credit_spending');
    const isIncome = type === 'income' && t.type === 'income';
    if (!isExpense && !isIncome) continue;
    const cat = t.category || '未分类';
    const existing = map.get(cat) ?? { total: 0, count: 0 };
    existing.total += t.amount;
    existing.count += 1;
    map.set(cat, existing);
    grandTotal += t.amount;
  }
  return Array.from(map.entries())
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function computeDailyTotals(
  transactions: TransactionRecord[],
  monthKey: string,
): { day: number; expense: number; income: number }[] {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const daily: { day: number; expense: number; income: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    daily.push({ day: d, expense: 0, income: 0 });
  }
  for (const t of transactions) {
    const date = new Date(t.occurredAt);
    const day = date.getDate();
    if (day >= 1 && day <= daysInMonth) {
      if (t.type === 'expense' || t.type === 'credit_spending') {
        daily[day - 1].expense += t.amount;
      } else if (t.type === 'income') {
        daily[day - 1].income += t.amount;
      }
    }
  }
  return daily;
}

const CATEGORY_COLORS = [
  '#e67e22',
  '#3498db',
  '#9b59b6',
  '#e74c3c',
  '#1abc9c',
  '#e84393',
  '#00b894',
  '#27ae60',
  '#f39c12',
  '#636e72',
  '#fd79a8',
  '#2980b9',
  '#6c5ce7',
  '#fdcb6e',
];

export function StatsPage() {
  const { transactions } = useAppData();
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const [selectedMonth, setSelectedMonth] = useState(
    () => availableMonths[0] || getMonthKey(new Date()),
  );
  const [budgets, setBudgets] = useState<BudgetMap>(loadBudgets);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const monthTransactions = useMemo(
    () => filterByMonth(transactions, selectedMonth),
    [transactions, selectedMonth],
  );

  const expenseStats = useMemo(
    () => computeCategoryStats(monthTransactions, 'expense'),
    [monthTransactions],
  );
  const incomeStats = useMemo(
    () => computeCategoryStats(monthTransactions, 'income'),
    [monthTransactions],
  );
  const dailyTotals = useMemo(
    () => computeDailyTotals(monthTransactions, selectedMonth),
    [monthTransactions, selectedMonth],
  );

  const totalExpense = expenseStats.reduce((s, c) => s + c.total, 0);
  const totalIncome = incomeStats.reduce((s, c) => s + c.total, 0);
  const daysWithData = dailyTotals.filter((d) => d.expense > 0 || d.income > 0).length;
  const dailyAvgExpense = daysWithData > 0 ? totalExpense / daysWithData : 0;

  // Determine primary currency from most transactions
  const jpyCount = monthTransactions.filter((t) => t.currency === 'JPY').length;
  const cnyCount = monthTransactions.filter((t) => t.currency === 'CNY').length;
  const mainCurrency = jpyCount >= cnyCount ? 'JPY' : 'CNY';

  const maxDailyValue = Math.max(...dailyTotals.map((d) => Math.max(d.expense, d.income)), 1);

  // Budget warnings
  const budgetWarnings = expenseStats
    .filter((s) => budgets[s.category] && s.total >= budgets[s.category] * 0.8)
    .map((s) => ({
      category: s.category,
      spent: s.total,
      budget: budgets[s.category],
      over: s.total >= budgets[s.category],
    }));

  function handleAddBudget() {
    if (!budgetCategory || !budgetAmount) return;
    const next = { ...budgets, [budgetCategory]: Number(budgetAmount) };
    setBudgets(next);
    saveBudgets(next);
    setBudgetCategory('');
    setBudgetAmount('');
  }

  function handleRemoveBudget(cat: string) {
    const next = { ...budgets };
    delete next[cat];
    setBudgets(next);
    saveBudgets(next);
  }

  function handleExportCsv() {
    const csv = transactionsToCsv(monthTransactions);
    const filename = `账单-${selectedMonth}.csv`;
    downloadCsv(csv, filename);
  }

  // Swipe gesture for month navigation
  const touchStartX = useRef<number | null>(null);
  const currentIdx = availableMonths.indexOf(selectedMonth);
  function goToMonth(delta: number) {
    if (availableMonths.length === 0) return;
    const idx = currentIdx === -1 ? 0 : currentIdx;
    const next = Math.max(0, Math.min(availableMonths.length - 1, idx + delta));
    if (availableMonths[next]) setSelectedMonth(availableMonths[next]);
  }
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      // older month is at higher index; swipe left = newer (smaller index)
      goToMonth(dx > 0 ? 1 : -1);
    }
    touchStartX.current = null;
  }

  // Get all known categories for budget dropdown
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  return (
    <section className="stack" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Month selector with swipe arrows */}
      <div className="panel panel--compact">
        <div className="stats-month-selector">
          <button
            type="button"
            className="stats-month-arrow"
            aria-label="上一个月"
            disabled={currentIdx >= availableMonths.length - 1}
            onClick={() => goToMonth(1)}
          >
            ‹
          </button>
          <select
            className="stats-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {availableMonths.length === 0 ? (
              <option value={getMonthKey(new Date())}>
                {getMonthLabel(getMonthKey(new Date()))}
              </option>
            ) : null}
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {getMonthLabel(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="stats-month-arrow"
            aria-label="下一个月"
            disabled={currentIdx <= 0}
            onClick={() => goToMonth(-1)}
          >
            ›
          </button>
          <button type="button" className="button button--ghost" onClick={handleExportCsv}>
            CSV
          </button>
        </div>
      </div>

      {/* Budget warnings */}
      {budgetWarnings.length > 0 ? (
        <div className="panel stats-budget-warnings">
          {budgetWarnings.map((w) => (
            <div
              key={w.category}
              className={`stats-budget-alert ${w.over ? 'stats-budget-alert--over' : 'stats-budget-alert--near'}`}
            >
              <strong>{w.category}</strong>
              <span>
                已花 {formatCurrency(w.spent, mainCurrency)} / 预算{' '}
                {formatCurrency(w.budget, mainCurrency)}
                {w.over ? ' — 已超支!' : ' — 接近上限'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Summary cards */}
      <div className="card-grid">
        <article className="summary-card summary-card--danger">
          <p className="summary-card__label">本月支出</p>
          <strong className="summary-card__value stats-amount--expense">
            {formatCurrency(totalExpense, mainCurrency)}
          </strong>
        </article>
        <article className="summary-card summary-card--accent">
          <p className="summary-card__label">本月收入</p>
          <strong className="summary-card__value stats-amount--income">
            {formatCurrency(totalIncome, mainCurrency)}
          </strong>
        </article>
      </div>
      <div className="card-grid">
        <article className="summary-card">
          <p className="summary-card__label">日均支出</p>
          <strong className="summary-card__value">
            {formatCurrency(Math.round(dailyAvgExpense), mainCurrency)}
          </strong>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">交易笔数</p>
          <strong className="summary-card__value">{monthTransactions.length} 笔</strong>
        </article>
      </div>

      {/* Daily trend chart */}
      {dailyTotals.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <h2>每日收支趋势</h2>
          </div>
          <div className="stats-chart">
            <div className="stats-chart__bars">
              {dailyTotals.map((d) => (
                <div key={d.day} className="stats-chart__col">
                  <div className="stats-chart__bar-group">
                    {d.income > 0 ? (
                      <div
                        className="stats-chart__bar stats-chart__bar--income"
                        style={{ height: `${(d.income / maxDailyValue) * 100}%` }}
                        title={`收入 ${formatCurrency(d.income, mainCurrency)}`}
                      />
                    ) : null}
                    {d.expense > 0 ? (
                      <div
                        className="stats-chart__bar stats-chart__bar--expense"
                        style={{ height: `${(d.expense / maxDailyValue) * 100}%` }}
                        title={`支出 ${formatCurrency(d.expense, mainCurrency)}`}
                      />
                    ) : null}
                  </div>
                  {d.day % 5 === 1 ? <span className="stats-chart__label">{d.day}</span> : null}
                </div>
              ))}
            </div>
            <div className="stats-chart__legend">
              <span className="stats-chart__legend-item stats-chart__legend-item--income">
                收入
              </span>
              <span className="stats-chart__legend-item stats-chart__legend-item--expense">
                支出
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Category breakdown */}
      {expenseStats.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <h2>支出分类</h2>
          </div>
          <div className="stats-categories">
            {expenseStats.map((stat, i) => (
              <div key={stat.category} className="stats-category-row">
                <div className="stats-category-info">
                  <span
                    className="stats-category-dot"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  <span className="stats-category-name">{stat.category}</span>
                  <span className="stats-category-count">{stat.count}笔</span>
                </div>
                <div className="stats-category-bar-wrap">
                  <div
                    className="stats-category-bar"
                    style={{
                      width: `${stat.percentage}%`,
                      backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }}
                  />
                </div>
                <div className="stats-category-amount">
                  <strong>{formatCurrency(stat.total, mainCurrency)}</strong>
                  <span className="stats-category-pct">{stat.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Budget management */}
      <section className="panel form-grid">
        <div className="panel__header">
          <h2>分类预算</h2>
          <p>为每个类别设置月度预算上限，超支时自动提醒。</p>
        </div>

        {Object.keys(budgets).length > 0 ? (
          <div className="stats-budget-list">
            {Object.entries(budgets).map(([cat, amt]) => {
              const spent = expenseStats.find((s) => s.category === cat)?.total ?? 0;
              const pct = amt > 0 ? Math.min((spent / amt) * 100, 100) : 0;
              return (
                <div key={cat} className="stats-budget-item">
                  <div className="stats-budget-item__header">
                    <strong>{cat}</strong>
                    <span>
                      {formatCurrency(spent, mainCurrency)} / {formatCurrency(amt, mainCurrency)}
                    </span>
                    <button
                      type="button"
                      className="button button--ghost ledger-action-btn"
                      onClick={() => handleRemoveBudget(cat)}
                    >
                      移除
                    </button>
                  </div>
                  <div className="stats-budget-bar">
                    <div
                      className={`stats-budget-fill ${pct >= 100 ? 'stats-budget-fill--over' : pct >= 80 ? 'stats-budget-fill--warn' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="status">暂未设置预算</p>
        )}

        <div className="stats-budget-add">
          <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}>
            <option value="">选择分类</option>
            {allCategories
              .filter((c) => !budgets[c])
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
          <input
            type="number"
            placeholder="预算金额"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
          />
          <button type="button" className="button" onClick={handleAddBudget}>
            添加
          </button>
        </div>
      </section>

      {monthTransactions.length === 0 ? (
        <div className="ledger-empty">
          <p className="ledger-empty__icon">📊</p>
          <p className="ledger-empty__title">本月暂无交易数据</p>
          <p className="ledger-empty__hint">记几笔账后这里就有统计了</p>
        </div>
      ) : null}
    </section>
  );
}
