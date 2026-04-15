import { convertToDualCurrencyValues, formatCurrency, type ExchangeRates } from '../lib/format';
import type { Currency } from '../types/api';

interface DualCurrencyAmountProps {
  cny: number;
  jpy: number;
  align?: 'start' | 'end';
}

interface NativeDualCurrencyAmountProps {
  amount: number;
  currency: Currency;
  rates: ExchangeRates;
  align?: 'start' | 'end';
}

/** Equal-weight two-line display used in summary hero and overview cards. */
export function DualCurrencyAmount({ cny, jpy, align = 'start' }: DualCurrencyAmountProps) {
  return (
    <div className={`dual-amount dual-amount--${align}`}>
      <span className="dual-amount__primary">{formatCurrency(cny, 'CNY')}</span>
      <span className="dual-amount__secondary">{formatCurrency(jpy, 'JPY')}</span>
    </div>
  );
}

/**
 * Shows the native currency as the primary (large) number and the converted
 * currency as the secondary (small, muted) number beneath it.
 */
export function NativeDualCurrencyAmount({
  amount,
  currency,
  rates,
  align = 'start',
}: NativeDualCurrencyAmountProps) {
  const values = convertToDualCurrencyValues(amount, currency, rates);
  const primaryText =
    currency === 'JPY' ? formatCurrency(values.jpy, 'JPY') : formatCurrency(values.cny, 'CNY');
  const secondaryText =
    currency === 'JPY' ? formatCurrency(values.cny, 'CNY') : formatCurrency(values.jpy, 'JPY');
  return (
    <div className={`dual-amount dual-amount--${align}`}>
      <span className="dual-amount__primary">{primaryText}</span>
      <span className="dual-amount__secondary">{secondaryText}</span>
    </div>
  );
}
