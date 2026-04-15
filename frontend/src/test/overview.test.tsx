import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { OverviewPage } from '../pages/OverviewPage';

test('renders overview balances and account list', async () => {
  render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText('净资产')).toBeInTheDocument();
  expect(await screen.findByText('PayPay 信用卡')).toBeInTheDocument();
  expect((await screen.findAllByText('0元')).length).toBeGreaterThan(0);
  expect((await screen.findAllByText('0円')).length).toBeGreaterThan(0);
});
