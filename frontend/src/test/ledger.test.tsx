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
    origin: 'manual',
    aiInputText: '',
  },
];

test('deletes a transaction via detail modal', async () => {
  const user = userEvent.setup();
  const deleteTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(<LedgerPage transactions={transactions} deleteTransactionImpl={deleteTransactionImpl} />);

  expect(screen.getByText('午饭')).toBeInTheDocument();
  expect(screen.getByText('38元')).toBeInTheDocument();
  expect(screen.getByText('760円')).toBeInTheDocument();

  // Click list item → opens detail modal
  await user.click(screen.getByRole('button', { name: /午饭/ }));

  // Click "删除" button inside detail modal
  await user.click(screen.getByRole('button', { name: '删除' }));

  // Confirmation dialog should appear
  expect(screen.getByRole('heading', { name: '确认删除' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '确认删除' }));

  expect(deleteTransactionImpl).toHaveBeenCalledWith(1);
});
