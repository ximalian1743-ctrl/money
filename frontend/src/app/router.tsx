import { createBrowserRouter } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { AiEntryPage } from '../pages/AiEntryPage';
import { LedgerPage } from '../pages/LedgerPage';
import { ManualEntryPage } from '../pages/ManualEntryPage';
import { OverviewPage } from '../pages/OverviewPage';
import { SettingsPage } from '../pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <OverviewPage />
      },
      {
        path: 'manual',
        element: <ManualEntryPage />
      },
      {
        path: 'ai',
        element: <AiEntryPage />
      },
      {
        path: 'ledger',
        element: <LedgerPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      }
    ]
  }
]);
