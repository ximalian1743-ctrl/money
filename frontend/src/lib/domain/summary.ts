import type { AccountBalance, SettingsRecord, SummaryResult, TransactionRecord } from './types';

export function computeAccountBalances(
  accounts: readonly AccountBalance[],
  transactions: readonly TransactionRecord[],
): AccountBalance[] {
  const balances = new Map<number, AccountBalance>();
  for (const account of accounts) {
    balances.set(account.id, {
      ...account,
      balance: account.initialBalance,
    });
  }

  for (const transaction of transactions) {
    if (transaction.deletedAt) continue;
    applyTransaction(balances, transaction);
  }

  return [...balances.values()];
}

function applyTransaction(
  balances: Map<number, AccountBalance>,
  transaction: TransactionRecord,
): void {
  const adjust = (accountId: number | null, delta: number) => {
    if (accountId === null) return;
    const account = balances.get(accountId);
    if (!account) return;
    account.balance += delta;
  };

  switch (transaction.type) {
    case 'expense':
      adjust(transaction.sourceAccountId, -transaction.amount);
      break;
    case 'income':
      adjust(transaction.targetAccountId, transaction.amount);
      break;
    case 'transfer':
      adjust(transaction.sourceAccountId, -transaction.amount);
      adjust(transaction.targetAccountId, transaction.amount);
      break;
    case 'credit_spending':
      adjust(transaction.targetAccountId, transaction.amount);
      break;
    case 'credit_transfer':
      // Credit card debt increases, target asset (transit card, wallet) increases.
      adjust(transaction.sourceAccountId, transaction.amount);
      adjust(transaction.targetAccountId, transaction.amount);
      break;
    case 'credit_repayment':
      adjust(transaction.sourceAccountId, -transaction.amount);
      adjust(transaction.targetAccountId, -transaction.amount);
      break;
  }
}

export function computeSummary(
  balances: readonly AccountBalance[],
  settings: SettingsRecord,
): SummaryResult {
  const cnyAssetTotal = balances
    .filter((item) => item.kind === 'asset' && item.currency === 'CNY')
    .reduce((sum, item) => sum + item.balance, 0);

  const jpyAssetTotal = balances
    .filter((item) => item.kind === 'asset' && item.currency === 'JPY')
    .reduce((sum, item) => sum + item.balance, 0);

  const totalLiabilitiesJpy = balances
    .filter((item) => item.kind === 'liability' && item.currency === 'JPY')
    .reduce((sum, item) => sum + item.balance, 0);

  const totalLiabilitiesCnyBase = totalLiabilitiesJpy * settings.jpyToCnyRate;
  const totalAssetsCnyBase = cnyAssetTotal + jpyAssetTotal * settings.jpyToCnyRate;
  const assetsInJpy = jpyAssetTotal + cnyAssetTotal * settings.cnyToJpyRate;

  return {
    balances: [...balances],
    cnyAssetTotal,
    jpyAssetTotal,
    assetsInCny: totalAssetsCnyBase,
    assetsInJpy,
    totalAssetsCnyBase,
    totalLiabilitiesJpy,
    totalLiabilitiesCnyBase,
    actualBalanceCnyBase: totalAssetsCnyBase - totalLiabilitiesCnyBase,
  };
}
