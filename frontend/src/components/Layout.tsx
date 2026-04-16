import { Link, Outlet, useLocation } from 'react-router-dom';

import { Fab } from './Fab';
import { TopBar } from './TopBar';
import { ToastProvider } from './Toast';

const navItems = [
  { to: '/', label: '总览', icon: '🏠' },
  { to: '/ledger', label: '流水', icon: '📒' },
  { to: '/stats', label: '统计', icon: '📊' },
];

export function Layout() {
  const location = useLocation();
  // Hide FAB on entry pages themselves
  const showFab = !['/manual', '/ai', '/settings'].includes(location.pathname);

  return (
    <ToastProvider>
      <div className="shell">
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <TopBar />

        <main id="main-content" className="content" tabIndex={-1}>
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="主导航">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'
                }
              >
                <span className="bottom-nav__icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="bottom-nav__label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {showFab ? <Fab /> : null}
      </div>
    </ToastProvider>
  );
}
