import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Fab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <div className={`fab-wrap${open ? ' fab-wrap--open' : ''}`} ref={ref}>
      {open ? (
        <div className="fab-menu">
          <button
            type="button"
            className="fab-menu__item"
            onClick={() => go('/ai')}
            aria-label="AI 记账"
          >
            <span className="fab-menu__icon">🤖</span>
            <span className="fab-menu__label">AI 记账</span>
          </button>
          <button
            type="button"
            className="fab-menu__item"
            onClick={() => go('/manual')}
            aria-label="手动记账"
          >
            <span className="fab-menu__icon">✏️</span>
            <span className="fab-menu__label">手动记账</span>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className={`fab${open ? ' fab--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? '关闭记账菜单' : '打开记账菜单'}
        aria-expanded={open}
      >
        <span className="fab__plus">+</span>
      </button>
    </div>
  );
}
