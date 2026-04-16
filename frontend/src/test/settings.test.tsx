import { render, screen } from '@testing-library/react';

import { SettingsPage } from '../pages/SettingsPage';

test('renders settings form with collapsible groups and auto-rate display', async () => {
  render(<SettingsPage />);

  // Exchange rate shows auto-sync indicator
  expect(await screen.findByText(/每日自动同步/)).toBeInTheDocument();

  // AI group summary visible
  expect(screen.getByText('AI 配置')).toBeInTheDocument();

  // API address label exists (AI group is open when no key is configured)
  expect(screen.getByLabelText('API 地址')).toBeInTheDocument();

  // Save button exists
  expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument();
});
