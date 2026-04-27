import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi } from 'vitest';

import { AiEntryPage } from '../pages/AiEntryPage';
import type { AccountBalance, ParsedDraft } from '../types/api';

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
    id: 8,
    name: 'PayPay 信用卡',
    kind: 'liability',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 100000,
  },
];

const draft: ParsedDraft = {
  type: 'expense',
  title: '午饭',
  amount: 38,
  currency: 'CNY',
  accountName: '现金纸币',
  targetAccountName: '',
  category: '餐饮',
  occurredAt: '2026-04-14T12:00:00.000Z',
  note: '',
  warnings: [],
};

beforeEach(() => {
  window.localStorage.clear();
});

test('parses a Chinese short sentence and shows editable draft preview', async () => {
  const user = userEvent.setup();
  const parseTransactionImpl = vi.fn().mockResolvedValue([draft]);
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={parseTransactionImpl}
      createTransactionImpl={createTransactionImpl}
    />,
  );

  await user.type(screen.getByLabelText('记账内容'), '午饭38元，用现金纸币');
  await user.click(screen.getByRole('button', { name: '解析文字' }));

  expect(parseTransactionImpl).toHaveBeenCalledWith({
    inputText: '午饭38元，用现金纸币',
    fallbackOccurredAt: expect.any(String),
  });

  expect(await screen.findByText('解析结果')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '确认入账' }));

  expect(createTransactionImpl).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '午饭',
      amount: 38,
      origin: 'ai',
    }),
  );
});

test('accepts two drafts for compound change scenario and saves both', async () => {
  const user = userEvent.setup();
  const expenseDraft: ParsedDraft = {
    type: 'expense',
    title: '超市买菜',
    amount: 5755,
    currency: 'JPY',
    accountName: '现金纸币',
    targetAccountName: '',
    category: '餐饮',
    occurredAt: '2026-04-17T18:00:00.000Z',
    note: '',
    warnings: [],
  };
  const coinChangeDraft: ParsedDraft = {
    type: 'transfer',
    title: '超市买菜·找零硬币',
    amount: 245,
    currency: 'JPY',
    accountName: '现金纸币',
    targetAccountName: '现金硬币',
    category: '找零',
    occurredAt: '2026-04-17T18:00:00.000Z',
    note: '',
    warnings: [],
  };
  const parseTransactionImpl = vi.fn().mockResolvedValue([expenseDraft, coinChangeDraft]);
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={parseTransactionImpl}
      createTransactionImpl={createTransactionImpl}
    />,
  );

  await user.type(screen.getByLabelText('记账内容'), '买菜花了5755日元，找零硬币245');
  await user.click(screen.getByRole('button', { name: '解析文字' }));

  expect(await screen.findByText('共解析出 2 笔交易，逐条确认或修改后入账')).toBeInTheDocument();

  const confirmButtons = await screen.findAllByRole('button', { name: '确认入账' });
  await user.click(confirmButtons[0]);
  const confirmButtons2 = await screen.findAllByRole('button', { name: '确认入账' });
  await user.click(confirmButtons2[0]);

  expect(createTransactionImpl).toHaveBeenCalledTimes(2);
  expect(createTransactionImpl).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      type: 'expense',
      amount: 5755,
      sourceAccountName: '现金纸币',
    }),
  );
  expect(createTransactionImpl).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      type: 'transfer',
      amount: 245,
      sourceAccountName: '现金纸币',
      targetAccountName: '现金硬币',
      category: '找零',
    }),
  );
});

test('restores cached ai input text after remount', async () => {
  const user = userEvent.setup();
  const parseTransactionImpl = vi.fn().mockResolvedValue([draft]);
  const view = render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={parseTransactionImpl}
      createTransactionImpl={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  await user.type(screen.getByLabelText('记账内容'), '午饭38元，用现金纸币');
  view.unmount();

  render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={vi.fn().mockResolvedValue([draft])}
      createTransactionImpl={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  expect(screen.getByLabelText('记账内容')).toHaveValue('午饭38元，用现金纸币');
});
