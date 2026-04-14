import type { AccountBalance, SummaryResult, SettingsRecord } from './types.js';

export function computeSummary(
  balances: AccountBalance[],
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
    balances,
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
