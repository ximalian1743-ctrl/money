import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '总览' },
  { to: '/manual', label: '记一笔' },
  { to: '/ai', label: 'AI' },
  { to: '/ledger', label: '流水' },
  { to: '/stats', label: '统计' },
  { to: '/settings', label: '设置' },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="hero">
        <p className="hero__eyebrow">PRIVATE MONEY RECORD</p>
        <h1>你的私人账本</h1>
        <p className="hero__subtitle">资产、欠款、汇率和 AI 记账放在同一条清晰流水里。</p>
      </header>

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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
