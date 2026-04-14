import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { LedgerPage } from '../pages/LedgerPage';
import type { TransactionRecord } from '../types/api';

const transactions: TransactionRecord[] = [
  {
    id: 1,
    type: 'expense',
    title: '午饭',
    note: '',
    amount: 38,
    currency: 'CNY',
    sourceAccountName: '现金纸币',
    targetAccountName: '',
    category: '餐饮',
    occurredAt: '2026-04-14T12:00:00.000Z',
  },
];

test('deletes a transaction from ledger list', async () => {
  const user = userEvent.setup();
  const deleteTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(<LedgerPage transactions={transactions} deleteTransactionImpl={deleteTransactionImpl} />);

  expect(screen.getByText('午饭')).toBeInTheDocument();
  expect(screen.getByText('CNY ¥38.00')).toBeInTheDocument();
  expect(screen.getByText('JPY 760')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '删除 午饭' }));

  expect(deleteTransactionImpl).toHaveBeenCalledWith(1);
});
