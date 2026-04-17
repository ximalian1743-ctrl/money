import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { ManualEntryPage } from '../pages/ManualEntryPage';
import type { AccountBalance } from '../types/api';

const accounts: AccountBalance[] = [
  {
    id: 2,
    name: '现金纸币',
    kind: 'asset',
    currency: 'CNY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 3,
    name: '现金硬币',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 6,
    name: '交通卡西瓜卡',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 8,
    name: 'PayPay 信用卡',
    kind: 'liability',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 100000,
  },
];

test('submits a manual expense', async () => {
  const user = userEvent.setup();
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <ManualEntryPage accounts={accounts} createTransactionImpl={createTransactionImpl} />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText('标题'), '午饭');
  await user.clear(screen.getByLabelText('金额'));
  await user.type(screen.getByLabelText('金额'), '38');
  await user.click(screen.getByRole('button', { name: '保存记录' }));

  expect(createTransactionImpl).toHaveBeenCalledTimes(1);
  expect(createTransactionImpl).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '午饭',
      amount: 38,
      sourceAccountName: '现金纸币',
    }),
  );
});

test('compound change: 10000 bill - 3000 bill change - 640 coin change = 6360 expense + 640 transfer', async () => {
  const user = userEvent.setup();
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <ManualEntryPage accounts={accounts} createTransactionImpl={createTransactionImpl} />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText('标题'), '超市买菜');
  await user.click(screen.getByLabelText('使用现金找零'));

  await user.clear(screen.getByLabelText('付款金额'));
  await user.type(screen.getByLabelText('付款金额'), '10000');
  await user.clear(screen.getByLabelText('找零纸币'));
  await user.type(screen.getByLabelText('找零纸币'), '3000');
  await user.clear(screen.getByLabelText('找零硬币'));
  await user.type(screen.getByLabelText('找零硬币'), '640');

  await user.click(screen.getByRole('button', { name: '保存记录' }));

  expect(createTransactionImpl).toHaveBeenCalledTimes(2);
  expect(createTransactionImpl).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      type: 'expense',
      title: '超市买菜',
      amount: 6360,
      sourceAccountName: '现金纸币',
    }),
  );
  expect(createTransactionImpl).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      type: 'transfer',
      amount: 640,
      sourceAccountName: '现金纸币',
      targetAccountName: '现金硬币',
    }),
  );
});

test('compound change with no coin change only emits the expense', async () => {
  const user = userEvent.setup();
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <ManualEntryPage accounts={accounts} createTransactionImpl={createTransactionImpl} />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText('标题'), '便利店');
  await user.click(screen.getByLabelText('使用现金找零'));

  await user.clear(screen.getByLabelText('付款金额'));
  await user.type(screen.getByLabelText('付款金额'), '1000');
  await user.clear(screen.getByLabelText('找零纸币'));
  await user.type(screen.getByLabelText('找零纸币'), '200');

  await user.click(screen.getByRole('button', { name: '保存记录' }));

  expect(createTransactionImpl).toHaveBeenCalledTimes(1);
  expect(createTransactionImpl).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'expense',
      amount: 800,
      sourceAccountName: '现金纸币',
    }),
  );
});
