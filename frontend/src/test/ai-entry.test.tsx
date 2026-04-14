import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi } from 'vitest';

import { AiEntryPage } from '../pages/AiEntryPage';
import type { AccountBalance, ParsedDraft } from '../types/api';

const accounts: AccountBalance[] = [
  { id: 2, name: '现金纸币', kind: 'asset', currency: 'CNY', balance: 0 },
  { id: 7, name: 'PayPay 信用卡', kind: 'liability', currency: 'JPY', balance: 0 },
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

test('parses a Chinese short sentence and shows draft preview', async () => {
  const user = userEvent.setup();
  const parseTransactionImpl = vi.fn().mockResolvedValue(draft);
  const createTransactionImpl = vi.fn().mockResolvedValue(undefined);

  render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={parseTransactionImpl}
      createTransactionImpl={createTransactionImpl}
    />,
  );

  await user.type(screen.getByLabelText('记账内容'), '午饭38元，用现金纸币');
  await user.clear(screen.getByLabelText('基准时间'));
  await user.type(screen.getByLabelText('基准时间'), '2026-04-14T09:30');
  await user.click(screen.getByRole('button', { name: '解析' }));

  const expectedFallbackOccurredAt = new Date('2026-04-14T09:30').toISOString();
  expect(parseTransactionImpl).toHaveBeenCalledWith({
    inputText: '午饭38元，用现金纸币',
    fallbackOccurredAt: expectedFallbackOccurredAt,
  });

  expect(await screen.findByText('解析结果')).toBeInTheDocument();
  expect(await screen.findByText('现金纸币')).toBeInTheDocument();
  expect(await screen.findByText('CNY ¥38.00')).toBeInTheDocument();
  expect(await screen.findByText('JPY JP¥760')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '确认入账' }));

  expect(createTransactionImpl).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '午饭',
      amount: 38,
      sourceAccountName: '现金纸币',
      origin: 'ai',
    }),
  );
  expect(await screen.findByText('已保存到流水')).toBeInTheDocument();
});

test('restores cached ai input and draft after remount', async () => {
  const user = userEvent.setup();
  const parseTransactionImpl = vi.fn().mockResolvedValue(draft);
  const view = render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={parseTransactionImpl}
      createTransactionImpl={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  await user.type(screen.getByLabelText('记账内容'), '午饭38元，用现金纸币');
  await user.click(screen.getByRole('button', { name: '解析' }));
  expect(await screen.findByText('解析结果')).toBeInTheDocument();

  view.unmount();

  render(
    <AiEntryPage
      accounts={accounts}
      parseTransactionImpl={vi.fn().mockResolvedValue(draft)}
      createTransactionImpl={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  expect(screen.getByLabelText('记账内容')).toHaveValue('午饭38元，用现金纸币');
  expect(await screen.findByText('解析结果')).toBeInTheDocument();
  expect(await screen.findByText('现金纸币')).toBeInTheDocument();
});
