import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { OverviewPage } from '../pages/OverviewPage';

test('renders overview balances and account list', async () => {
  render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>
  );

  expect(await screen.findByText('总存款')).toBeInTheDocument();
  expect(await screen.findByText('PayPay 信用卡')).toBeInTheDocument();
  expect((await screen.findAllByText('CNY ¥0.00')).length).toBeGreaterThan(0);
  expect((await screen.findAllByText('JPY JP¥0')).length).toBeGreaterThan(0);
});
