import type { AccountBalance } from '../types/api';

export type AccountGroup = '现金类' | '银行类' | '电子钱包' | '交通卡' | '信用卡';

/** Derive an emoji/icon for an account from its name + kind. */
export function getAccountIcon(account: AccountBalance): string {
  if (account.kind === 'liability') return '💳';
  const n = account.name;
  if (n.includes('现金') || n.includes('纸币') || n.includes('硬币')) return '💵';
  if (n.includes('银行') || n.includes('存折') || n.includes('储蓄卡')) return '🏦';
  if (n.includes('交通') || n.includes('西瓜') || n.includes('Suica')) return '🚇';
  if (
    n.includes('钱包') ||
    n.includes('電子') ||
    n.includes('PayPay') ||
    n.includes('微信') ||
    n.includes('支付宝')
  ) {
    return '📱';
  }
  return '💰';
}

export function getAccountGroup(account: AccountBalance): AccountGroup {
  if (account.kind === 'liability') return '信用卡';
  const n = account.name;
  if (n.includes('现金') || n.includes('纸币') || n.includes('硬币')) return '现金类';
  if (n.includes('银行') || n.includes('存折') || n.includes('储蓄卡')) return '银行类';
  if (n.includes('交通') || n.includes('西瓜') || n.includes('Suica')) return '交通卡';
  return '电子钱包';
}

/** Stable group order for display. */
export const GROUP_ORDER: AccountGroup[] = ['现金类', '银行类', '电子钱包', '交通卡', '信用卡'];

export function groupAccounts(
  accounts: AccountBalance[],
): { group: AccountGroup; items: AccountBalance[] }[] {
  const buckets = new Map<AccountGroup, AccountBalance[]>();
  for (const a of accounts) {
    const g = getAccountGroup(a);
    const bucket = buckets.get(g) ?? [];
    bucket.push(a);
    buckets.set(g, bucket);
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({
    group: g,
    items: buckets.get(g) ?? [],
  }));
}
