import type { TransactionRecord } from '../types/api';
import { formatDateTime } from './format';

const TYPE_LABELS: Record<string, string> = {
  expense: '支出',
  income: '收入',
  transfer: '转账',
  credit_spending: '信用消费',
  credit_repayment: '信用还款',
  credit_transfer: '信用充值',
};

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function transactionsToCsv(transactions: TransactionRecord[]): string {
  const headers = ['日期', '类型', '标题', '金额', '币种', '来源账户', '目标账户', '分类', '备注'];
  const rows = transactions.map((t) => [
    formatDateTime(t.occurredAt),
    TYPE_LABELS[t.type] ?? t.type,
    t.title,
    String(t.amount),
    t.currency === 'JPY' ? '日元' : '人民币',
    t.sourceAccountName,
    t.targetAccountName,
    t.category,
    t.note,
  ]);
  const csvContent = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  return '\uFEFF' + csvContent; // BOM for Excel UTF-8
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
