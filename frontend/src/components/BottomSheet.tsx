import { useEffect, useRef, useState, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  /** prevent backdrop dismiss (e.g. during pending submission) */
  locked?: boolean;
}

/**
 * Bottom-anchored sheet that slides up from the screen bottom.
 * - Drag the grabber (or content) down to dismiss.
 * - Tap backdrop to dismiss.
 * - Keyboard: Esc to dismiss.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  headerExtra,
  children,
  locked,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !locked) onClose();
    }
    document.addEventListener('keydown', onKey);
    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, locked]);

  if (!open) return null;

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  }
  function handleTouchEnd() {
    if (dragY > 120 && !locked) {
      onClose();
    }
    setDragY(0);
    startYRef.current = null;
  }

  return (
    <div className="sheet-backdrop" onClick={locked ? undefined : onClose}>
      <div
        ref={sheetRef}
        className="sheet"
        style={{ transform: `translateY(${dragY}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet__grabber-row"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="sheet__grabber" />
        </div>
        {title || headerExtra ? (
          <div className="sheet__header">
            {title ? <h3 className="sheet__title">{title}</h3> : null}
            {headerExtra}
          </div>
        ) : null}
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
