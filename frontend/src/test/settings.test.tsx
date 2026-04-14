import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsPage } from '../pages/SettingsPage';

test('loads models after endpoint configuration', async () => {
  const user = userEvent.setup();
  render(<SettingsPage />);

  await user.type(screen.getByLabelText('API 地址'), 'https://example.com/v1/chat/completions');
  await user.click(screen.getByRole('button', { name: '加载模型列表' }));

  expect(await screen.findByText('模型')).toBeInTheDocument();
});
