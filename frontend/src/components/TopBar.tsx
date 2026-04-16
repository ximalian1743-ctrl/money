import { Link, useLocation } from 'react-router-dom';

const TITLE_BY_PATH: Record<string, string> = {
  '/': '总览',
  '/manual': '手动记账',
  '/ai': 'AI 记账',
  '/ledger': '流水',
  '/stats': '统计',
  '/settings': '设置',
};

export function TopBar() {
  const location = useLocation();
  const title = TITLE_BY_PATH[location.pathname] ?? '账本';
  const onSettings = location.pathname === '/settings';

  return (
    <header className="topbar">
      <div className="topbar__title">{title}</div>
      {!onSettings ? (
        <Link to="/settings" className="topbar__icon-btn" aria-label="设置">
          ⚙
        </Link>
      ) : null}
    </header>
  );
}
