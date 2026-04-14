import {
  convertToDualCurrencyValues,
  formatCurrencyWithCode,
  type ExchangeRates
} from '../lib/format';
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

export function DualCurrencyAmount({
  cny,
  jpy,
  align = 'start'
}: DualCurrencyAmountProps) {
  return (
    <div className={`dual-amount dual-amount--${align}`}>
      <span>{formatCurrencyWithCode(cny, 'CNY')}</span>
      <span>{formatCurrencyWithCode(jpy, 'JPY')}</span>
    </div>
  );
}

export function NativeDualCurrencyAmount({
  amount,
  currency,
  rates,
  align = 'start'
}: NativeDualCurrencyAmountProps) {
  const values = convertToDualCurrencyValues(amount, currency, rates);
  return <DualCurrencyAmount cny={values.cny} jpy={values.jpy} align={align} />;
}
