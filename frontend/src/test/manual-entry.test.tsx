import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ManualEntryPage } from '../pages/ManualEntryPage';
import type { AccountBalance } from '../types/api';

const accounts: AccountBalance[] = [
  { id: 2, name: '现金纸币', kind: 'asset', currency: 'CNY', balance: 0, initialBalance: 0 },
  { id: 6, name: '交通卡西瓜卡', kind: 'asset', currency: 'JPY', balance: 0, initialBalance: 0 },
  {
    id: 7,
    name: 'PayPay 信用卡',
    kind: 'liability',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
  },
];

test('submits a manual expense', async () => {
  const user = userEvent.setup();
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(<ManualEntryPage accounts={accounts} createTransactionImpl={createTransactionImpl} />);

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
  expect(await screen.findByText('保存成功')).toBeInTheDocument();
});
