import type { Currency } from '../types/api';

export interface ExchangeRates {
  cnyToJpyRate: number;
  jpyToCnyRate: number;
}

export function formatCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  }).format(value);
}

export function formatCurrencyWithCode(value: number, currency: Currency): string {
  return `${currency} ${formatCurrency(value, currency)}`;
}

export function convertToDualCurrencyValues(
  amount: number,
  currency: Currency,
  rates: ExchangeRates
): { cny: number; jpy: number } {
  if (currency === 'JPY') {
    return {
      cny: amount * rates.jpyToCnyRate,
      jpy: amount
    };
  }

  return {
    cny: amount,
    jpy: amount * rates.cnyToJpyRate
  };
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
