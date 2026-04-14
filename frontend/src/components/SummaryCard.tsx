import type { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'accent' | 'danger';
}

export function SummaryCard({ label, value, tone = 'default' }: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card--${tone}`}>
      <p className="summary-card__label">{label}</p>
      <strong className="summary-card__value">{value}</strong>
    </article>
  );
}
