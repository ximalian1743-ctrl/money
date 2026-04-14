import type { Currency } from '../types/api';

export interface ExchangeRates {
  cnyToJpyRate: number;
  jpyToCnyRate: number;
}

function formatJpy(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';
  if (abs >= 10000) {
    const wan = Math.floor(abs / 10000);
    const remainder = abs % 10000;
    return remainder === 0 ? `${sign}${wan}万` : `${sign}${wan}万${remainder}`;
  }
  return `${sign}${abs}`;
}

export function formatCurrency(value: number, currency: Currency): string {
  if (currency === 'JPY') {
    return formatJpy(value);
  }
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyWithCode(value: number, currency: Currency): string {
  return `${currency} ${formatCurrency(value, currency)}`;
}

export function convertToDualCurrencyValues(
  amount: number,
  currency: Currency,
  rates: ExchangeRates,
): { cny: number; jpy: number } {
  if (currency === 'JPY') {
    return {
      cny: amount * rates.jpyToCnyRate,
      jpy: amount,
    };
  }

  return {
    cny: amount,
    jpy: amount * rates.cnyToJpyRate,
  };
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
