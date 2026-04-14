import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Layout } from '../components/Layout';

const OverviewPage = lazy(() =>
  import('../pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const ManualEntryPage = lazy(() =>
  import('../pages/ManualEntryPage').then((m) => ({ default: m.ManualEntryPage })),
);
const AiEntryPage = lazy(() =>
  import('../pages/AiEntryPage').then((m) => ({ default: m.AiEntryPage })),
);
const LedgerPage = lazy(() =>
  import('../pages/LedgerPage').then((m) => ({ default: m.LedgerPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p className="status" role="status" aria-live="polite">
          加载中…
        </p>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <RouteSuspense>
            <OverviewPage />
          </RouteSuspense>
        ),
      },
      {
        path: 'manual',
        element: (
          <RouteSuspense>
            <ManualEntryPage />
          </RouteSuspense>
        ),
      },
      {
        path: 'ai',
        element: (
          <RouteSuspense>
            <AiEntryPage />
          </RouteSuspense>
        ),
      },
      {
        path: 'ledger',
        element: (
          <RouteSuspense>
            <LedgerPage />
          </RouteSuspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <RouteSuspense>
            <SettingsPage />
          </RouteSuspense>
        ),
      },
    ],
  },
]);
